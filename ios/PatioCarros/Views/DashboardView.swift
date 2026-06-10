import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var db: DatabaseService
    @State private var totalHoje = 0
    @State private var totalNoPatio = 0
    @State private var movimentos: [Movimentacao] = []
    @State private var isLoading = false
    @State private var errorMsg: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if !db.isConnected {
                        ConnectionBanner()
                    }

                    HStack(spacing: 12) {
                        StatCard(
                            title: "Movimentos Hoje",
                            value: "\(totalHoje)",
                            color: .blue,
                            icon: "arrow.left.arrow.right"
                        )
                        StatCard(
                            title: "No Pátio Agora",
                            value: "\(totalNoPatio)",
                            color: .green,
                            icon: "car.fill"
                        )
                    }
                    .padding(.horizontal)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Últimas Movimentações")
                            .font(.headline)
                            .padding(.horizontal)

                        if isLoading {
                            ProgressView().frame(maxWidth: .infinity)
                        } else if let err = errorMsg {
                            Text(err)
                                .foregroundStyle(.red)
                                .padding()
                        } else if movimentos.isEmpty {
                            Text("Nenhuma movimentação registrada")
                                .foregroundStyle(.secondary)
                                .padding()
                        } else {
                            ForEach(movimentos) { mov in
                                MovimentacaoRow(movimentacao: mov)
                                Divider().padding(.leading, 56)
                            }
                        }
                    }
                }
                .padding(.top)
            }
            .navigationTitle("Dashboard")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { Task { await load() } }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .task { await load() }
            .refreshable { await load() }
        }
    }

    private func load() async {
        guard db.isConnected else { return }
        isLoading = true
        errorMsg = nil
        do {
            let result = try await db.fetchDashboard()
            totalHoje = result.totalHoje
            totalNoPatio = result.totalNoPatio
            movimentos = result.movimentos
        } catch {
            errorMsg = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - StatCard

struct StatCard: View {
    let title: String
    let value: String
    let color: Color
    let icon: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: icon).foregroundStyle(color)
                Spacer()
            }
            Text(value)
                .font(.system(size: 36, weight: .bold))
                .foregroundStyle(color)
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial)
        .cornerRadius(12)
    }
}

// MARK: - MovimentacaoRow

struct MovimentacaoRow: View {
    let movimentacao: Movimentacao

    var body: some View {
        HStack(spacing: 12) {
            Image(
                systemName: movimentacao.tipo == .entrada
                    ? "arrow.down.circle.fill"
                    : "arrow.up.circle.fill"
            )
            .foregroundStyle(movimentacao.tipo == .entrada ? .green : .red)
            .font(.title2)

            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(movimentacao.placa).font(.headline)
                    Spacer()
                    Text(movimentacao.tipo == .entrada ? "Entrada" : "Saída")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(
                            movimentacao.tipo == .entrada
                                ? Color.green.opacity(0.2)
                                : Color.red.opacity(0.2)
                        )
                        .foregroundStyle(movimentacao.tipo == .entrada ? .green : .red)
                        .cornerRadius(6)
                }
                if let marca = movimentacao.marca, let modelo = movimentacao.modelo {
                    Text("\(marca) \(modelo)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Text(movimentacao.dataHora, style: .relative)
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }
}

// MARK: - ConnectionBanner

struct ConnectionBanner: View {
    @EnvironmentObject var db: DatabaseService

    var body: some View {
        HStack {
            Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.orange)
            Text(db.connectionError ?? "Sem conexão com o banco de dados")
                .font(.caption)
            Spacer()
        }
        .padding()
        .background(Color.orange.opacity(0.15))
        .cornerRadius(8)
        .padding(.horizontal)
    }
}
