import Foundation

struct Veiculo: Identifiable, Equatable {
    var id: Int
    var placa: String
    var marca: String
    var modelo: String
    var ano: Int?
    var cor: String?
    var proprietario: String?
}

struct Movimentacao: Identifiable {
    var id: Int
    var veiculoId: Int
    var placa: String
    var tipo: TipoMovimentacao
    var dataHora: Date
    var marca: String?
    var modelo: String?
    var observacao: String?
}

enum TipoMovimentacao: String {
    case entrada
    case saida
}

struct VeiculoNoPatio: Identifiable {
    var id: Int
    var placa: String
    var marca: String
    var modelo: String
    var cor: String?
    var proprietario: String?
    var entrada: Date

    var tempoEstadia: String {
        let diff = Date().timeIntervalSince(entrada)
        let hours = Int(diff) / 3600
        let minutes = (Int(diff) % 3600) / 60
        if hours > 0 { return "\(hours)h \(minutes)min" }
        return "\(minutes)min"
    }
}

struct DadosDetran {
    var placa: String
    var marca: String
    var modelo: String
    var ano: Int?
    var cor: String?
    var proprietario: String?
}
