import Foundation
import MySQLNIO
import NIOPosix
import NIOCore

@MainActor
class DatabaseService: ObservableObject {
    static let shared = DatabaseService()

    @Published var isConnected = false
    @Published var connectionError: String?

    private var connection: MySQLConnection?
    private let eventLoopGroup = MultiThreadedEventLoopGroup(numberOfThreads: 2)

    private init() {}

    // MARK: - Connection

    func connect() async {
        let s = AppSettings.shared
        await connect(
            host: s.dbHost,
            port: s.dbPort,
            user: s.dbUser,
            password: s.dbPassword,
            database: s.dbName
        )
    }

    func connect(host: String, port: Int, user: String, password: String, database: String) async {
        do {
            if let existing = connection {
                try? await existing.close().get()
            }
            let socketAddr = try SocketAddress.makeAddressResolvingHost(host, port: port)
            let conn = try await MySQLConnection.connect(
                to: socketAddr,
                username: user,
                database: database,
                password: password.isEmpty ? nil : password,
                tlsConfiguration: nil,
                on: eventLoopGroup.next()
            ).get()
            connection = conn
            isConnected = true
            connectionError = nil
        } catch {
            connection = nil
            isConnected = false
            connectionError = error.localizedDescription
        }
    }

    func disconnect() async {
        try? await connection?.close().get()
        connection = nil
        isConnected = false
    }

    private func ensureConnected() async throws -> MySQLConnection {
        if let conn = connection { return conn }
        await connect()
        guard let conn = connection else {
            throw DBError.notConnected
        }
        return conn
    }

    // MARK: - Dashboard

    func fetchDashboard() async throws -> (totalHoje: Int, totalNoPatio: Int, movimentos: [Movimentacao]) {
        let conn = try await ensureConnected()

        async let totalHojeRows = conn.query(
            "SELECT COUNT(*) as c FROM movimentacoes WHERE DATE(data_hora) = CURDATE()"
        ).get()
        async let totalNoPatioRows = conn.query(
            """
            SELECT COUNT(DISTINCT m.veiculo_id) as c
            FROM movimentacoes m
            WHERE m.tipo = 'entrada'
              AND NOT EXISTS (
                SELECT 1 FROM movimentacoes s
                WHERE s.veiculo_id = m.veiculo_id
                  AND s.tipo = 'saida'
                  AND s.data_hora > m.data_hora
              )
              AND m.data_hora = (
                SELECT MAX(m2.data_hora) FROM movimentacoes m2
                WHERE m2.veiculo_id = m.veiculo_id
              )
            """
        ).get()
        async let movimentosRows = conn.query(
            """
            SELECT m.id, m.veiculo_id, m.placa, m.tipo, m.data_hora, m.observacao,
                   v.marca, v.modelo
            FROM movimentacoes m
            LEFT JOIN veiculos v ON v.id = m.veiculo_id
            ORDER BY m.data_hora DESC
            LIMIT 10
            """
        ).get()

        let hoje = try await totalHojeRows.first?.column("c")?.int ?? 0
        let patio = try await totalNoPatioRows.first?.column("c")?.int ?? 0
        let movs = try await movimentosRows.map { parseMovimentacao($0) }
        return (hoje, patio, movs)
    }

    // MARK: - Pátio atual

    func fetchVeiculosNoPatio() async throws -> [VeiculoNoPatio] {
        let conn = try await ensureConnected()
        let rows = try await conn.query(
            """
            SELECT v.id, v.placa, v.marca, v.modelo, v.cor, v.proprietario,
                   m.data_hora as entrada
            FROM veiculos v
            JOIN movimentacoes m ON m.veiculo_id = v.id
            WHERE m.tipo = 'entrada'
              AND NOT EXISTS (
                SELECT 1 FROM movimentacoes s
                WHERE s.veiculo_id = v.id
                  AND s.tipo = 'saida'
                  AND s.data_hora > m.data_hora
              )
              AND m.data_hora = (
                SELECT MAX(m2.data_hora) FROM movimentacoes m2
                WHERE m2.veiculo_id = v.id
              )
            ORDER BY m.data_hora ASC
            """
        ).get()

        return rows.map { row in
            VeiculoNoPatio(
                id: row.column("id")?.int ?? 0,
                placa: row.column("placa")?.string ?? "",
                marca: row.column("marca")?.string ?? "",
                modelo: row.column("modelo")?.string ?? "",
                cor: row.column("cor")?.string,
                proprietario: row.column("proprietario")?.string,
                entrada: row.column("entrada")?.date ?? Date()
            )
        }
    }

    // MARK: - Entrada

    func verificarVeiculoNoPatio(placa: String) async throws -> Bool {
        let conn = try await ensureConnected()
        let rows = try await conn.query(
            """
            SELECT COUNT(*) as c
            FROM movimentacoes m
            WHERE m.placa = ?
              AND m.tipo = 'entrada'
              AND NOT EXISTS (
                SELECT 1 FROM movimentacoes s
                WHERE s.placa = ?
                  AND s.tipo = 'saida'
                  AND s.data_hora > m.data_hora
              )
              AND m.data_hora = (
                SELECT MAX(m2.data_hora) FROM movimentacoes m2
                WHERE m2.placa = ?
              )
            """,
            [
                mysqlString(placa),
                mysqlString(placa),
                mysqlString(placa),
            ]
        ).get()
        return (rows.first?.column("c")?.int ?? 0) > 0
    }

    func registrarEntrada(veiculo: DadosDetran, observacao: String?) async throws {
        let conn = try await ensureConnected()

        // Upsert veiculo
        try await conn.query(
            """
            INSERT INTO veiculos (placa, marca, modelo, ano, cor, proprietario)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              marca = VALUES(marca), modelo = VALUES(modelo), ano = VALUES(ano),
              cor = VALUES(cor), proprietario = VALUES(proprietario), updated_at = NOW()
            """,
            [
                mysqlString(veiculo.placa),
                mysqlString(veiculo.marca),
                mysqlString(veiculo.modelo),
                veiculo.ano.map { mysqlInt($0) } ?? mysqlNull(),
                veiculo.cor.map { mysqlString($0) } ?? mysqlNull(),
                veiculo.proprietario.map { mysqlString($0) } ?? mysqlNull(),
            ]
        ).get()

        // Get veiculo id
        let rows = try await conn.query(
            "SELECT id FROM veiculos WHERE placa = ?",
            [mysqlString(veiculo.placa)]
        ).get()
        guard let veiculoId = rows.first?.column("id")?.int else { throw DBError.queryFailed }

        // Insert entrada
        try await conn.query(
            "INSERT INTO movimentacoes (veiculo_id, placa, tipo, observacao) VALUES (?, ?, 'entrada', ?)",
            [
                mysqlInt(veiculoId),
                mysqlString(veiculo.placa),
                observacao.map { mysqlString($0) } ?? mysqlNull(),
            ]
        ).get()
    }

    // MARK: - Saída

    func registrarSaida(placa: String, observacao: String?) async throws -> (entrada: Date, saida: Date) {
        let conn = try await ensureConnected()

        // Get veiculo id
        let vRows = try await conn.query(
            "SELECT id FROM veiculos WHERE placa = ?",
            [mysqlString(placa)]
        ).get()
        guard let veiculoId = vRows.first?.column("id")?.int else { throw DBError.veiculoNaoEncontrado }

        // Get last entrada time
        let mRows = try await conn.query(
            """
            SELECT data_hora FROM movimentacoes
            WHERE veiculo_id = ? AND tipo = 'entrada'
            ORDER BY data_hora DESC LIMIT 1
            """,
            [mysqlInt(veiculoId)]
        ).get()
        let entrada = mRows.first?.column("data_hora")?.date ?? Date()

        try await conn.query(
            "INSERT INTO movimentacoes (veiculo_id, placa, tipo, observacao) VALUES (?, ?, 'saida', ?)",
            [
                mysqlInt(veiculoId),
                mysqlString(placa),
                observacao.map { mysqlString($0) } ?? mysqlNull(),
            ]
        ).get()

        return (entrada, Date())
    }

    // MARK: - Histórico

    func fetchHistorico(placa: String?, dataInicio: Date?, dataFim: Date?) async throws -> [Movimentacao] {
        let conn = try await ensureConnected()

        var sql = """
            SELECT m.id, m.veiculo_id, m.placa, m.tipo, m.data_hora, m.observacao,
                   v.marca, v.modelo
            FROM movimentacoes m
            LEFT JOIN veiculos v ON v.id = m.veiculo_id
            WHERE 1=1
            """
        var params: [MySQLData] = []

        if let p = placa, !p.isEmpty {
            sql += " AND m.placa LIKE ?"
            params.append(mysqlString("%\(p.uppercased())%"))
        }
        if let d = dataInicio {
            sql += " AND m.data_hora >= ?"
            params.append(mysqlString(iso8601(d)))
        }
        if let d = dataFim {
            sql += " AND m.data_hora <= ?"
            params.append(mysqlString(iso8601(d)))
        }
        sql += " ORDER BY m.data_hora DESC LIMIT 200"

        let rows = try await conn.query(sql, params).get()
        return rows.map { parseMovimentacao($0) }
    }

    // MARK: - Helpers

    private func parseMovimentacao(_ row: MySQLRow) -> Movimentacao {
        Movimentacao(
            id: row.column("id")?.int ?? 0,
            veiculoId: row.column("veiculo_id")?.int ?? 0,
            placa: row.column("placa")?.string ?? "",
            tipo: (row.column("tipo")?.string == "entrada") ? .entrada : .saida,
            dataHora: row.column("data_hora")?.date ?? Date(),
            marca: row.column("marca")?.string,
            modelo: row.column("modelo")?.string,
            observacao: row.column("observacao")?.string
        )
    }

    private func iso8601(_ date: Date) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate, .withTime, .withColonSeparatorInTime]
        return f.string(from: date)
    }
}

// MARK: - MySQLData factory helpers
// These wrappers isolate us from MySQLData initializer API differences across versions.

/// Creates a MySQLData from a String value.
private func mysqlString(_ value: String) -> MySQLData {
    MySQLData(string: value)
}

/// Creates a MySQLData from an Int value using string encoding (universally safe).
private func mysqlInt(_ value: Int) -> MySQLData {
    MySQLData(string: String(value))
}

/// Creates a MySQL NULL value.
private func mysqlNull() -> MySQLData {
    MySQLData(string: nil)
}

// MARK: - Errors

enum DBError: LocalizedError {
    case notConnected
    case queryFailed
    case veiculoNaoEncontrado

    var errorDescription: String? {
        switch self {
        case .notConnected: return "Não conectado ao banco de dados"
        case .queryFailed: return "Falha na consulta"
        case .veiculoNaoEncontrado: return "Veículo não encontrado"
        }
    }
}
