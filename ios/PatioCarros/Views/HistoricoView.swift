import SwiftUI

struct HistoricoView: View {
    @EnvironmentObject var db: DatabaseService
    @State private var movimentos: [Movimentacao] = []
    @State private var isLoading = false
    @State private var errorMsg: String?
    @State private var filtroPlaca = ""
    @State private var filtroInicio: Date? = nil
    @State private var filtroFim: Date? = nil
    @State private var showFiltros = false

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView("Carregando...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let err = errorMsg {
                    ContentUnavailableView(
                        err,
                        systemImage: "exclamationmark.triangle"
                    )
                } else if movimentos.isEmpty {
                    ContentUnavailableView(
                        "Sem Registros",
                        systemImage: "clock",
                        description: Text(
                            filtroAtivo
                                ? "Nenhuma movimentação encontrada com esses filtros"
                                : "Nenhuma movimentação registrada ainda"
                        )
                    )
                } else {
                    List(movimentos) { mov in
                        MovimentacaoHistoricoRow(mov: mov)
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("Histórico")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: { showFiltros.toggle() }) {
                        Image(
                            systemName: filtroAtivo
                                ? "line.3.horizontal.decrease.circle.fill"
                                : "line.3.horizontal.decrease.circle"
                        )
                        .foregroundStyle(filtroAtivo ? .blue : .primary)
                    }
                    .accessibilityLabel(filtroAtivo ? "Filtros ativos — editar" : "Filtros")
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { Task { await load() } }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .sheet(isPresented: $showFiltros) {
                FiltrosSheet(
                    placa: $filtroPlaca,
                    inicio: $filtroInicio,
                    fim: $filtroFim
                ) {
                    showFiltros = false
                    Task { await load() }
                }
            }
            .task { await load() }
            .refreshable { await load() }
        }
    }

    private var filtroAtivo: Bool {
        !filtroPlaca.isEmpty || filtroInicio != nil || filtroFim != nil
    }

    private func load() async {
        guard db.isConnected else { return }
        isLoading = true
        errorMsg = nil
        do {
            movimentos = try await db.fetchHistorico(
                placa: filtroPlaca.isEmpty ? nil : filtroPlaca,
                dataInicio: filtroInicio,
                dataFim: filtroFim
            )
        } catch {
            errorMsg = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - MovimentacaoHistoricoRow

struct MovimentacaoHistoricoRow: View {
    let mov: Movimentacao

    var body: some View {
        HStack(spacing: 12) {
            Image(
                systemName: mov.tipo == .entrada
                    ? "arrow.down.circle.fill"
                    : "arrow.up.circle.fill"
            )
            .foregroundStyle(mov.tipo == .entrada ? .green : .red)
            .font(.title3)

            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(mov.placa)
                        .font(.headline)
                        .fontDesign(.monospaced)
                    Spacer()
                    Text(mov.tipo == .entrada ? "Entrada" : "Saída")
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(
                            mov.tipo == .entrada
                                ? Color.green.opacity(0.15)
                                : Color.red.opacity(0.15)
                        )
                        .foregroundStyle(mov.tipo == .entrada ? .green : .red)
                        .cornerRadius(4)
                }

                if let marca = mov.marca, let modelo = mov.modelo, !marca.isEmpty {
                    Text("\(marca) \(modelo)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Text(mov.dataHora, format: .dateTime.day().month().year().hour().minute())
                    .font(.caption)
                    .foregroundStyle(.tertiary)

                if let obs = mov.observacao, !obs.isEmpty {
                    Text(obs)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                        .lineLimit(2)
                }
            }
        }
        .padding(.vertical, 2)
    }
}

// MARK: - FiltrosSheet

struct FiltrosSheet: View {
    @Binding var placa: String
    @Binding var inicio: Date?
    @Binding var fim: Date?
    let onAplicar: () -> Void

    @State private var usarInicio = false
    @State private var usarFim = false
    @State private var inicioTemp = Calendar.current.startOfDay(for: Date())
    @State private var fimTemp = Date()

    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Placa") {
                    TextField("Ex: ABC1234", text: $placa)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                }

                Section("Período") {
                    Toggle("Filtrar por data de início", isOn: $usarInicio.animation())
                    if usarInicio {
                        DatePicker(
                            "Data início",
                            selection: $inicioTemp,
                            displayedComponents: [.date, .hourAndMinute]
                        )
                        .datePickerStyle(.compact)
                    }

                    Toggle("Filtrar por data de fim", isOn: $usarFim.animation())
                    if usarFim {
                        DatePicker(
                            "Data fim",
                            selection: $fimTemp,
                            in: usarInicio ? inicioTemp... : .distantPast...,
                            displayedComponents: [.date, .hourAndMinute]
                        )
                        .datePickerStyle(.compact)
                    }
                }
            }
            .navigationTitle("Filtros")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                if let i = inicio { inicioTemp = i; usarInicio = true }
                if let f = fim { fimTemp = f; usarFim = true }
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Limpar") {
                        placa = ""
                        inicio = nil
                        fim = nil
                        usarInicio = false
                        usarFim = false
                        onAplicar()
                    }
                    .foregroundStyle(.red)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Aplicar") {
                        inicio = usarInicio ? inicioTemp : nil
                        fim = usarFim ? fimTemp : nil
                        onAplicar()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
    }
}
