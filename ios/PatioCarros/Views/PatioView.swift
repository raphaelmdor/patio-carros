import SwiftUI

struct PatioView: View {
    @EnvironmentObject var db: DatabaseService
    @State private var veiculos: [VeiculoNoPatio] = []
    @State private var isLoading = false
    @State private var errorMsg: String?
    @State private var searchText = ""
    @State private var selectedVeiculo: VeiculoNoPatio?

    var filtered: [VeiculoNoPatio] {
        guard !searchText.isEmpty else { return veiculos }
        let query = searchText.uppercased()
        return veiculos.filter {
            $0.placa.contains(query) ||
            $0.marca.localizedCaseInsensitiveContains(searchText) ||
            $0.modelo.localizedCaseInsensitiveContains(searchText) ||
            ($0.proprietario?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

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
                } else if veiculos.isEmpty {
                    ContentUnavailableView(
                        "Pátio Vazio",
                        systemImage: "car.fill",
                        description: Text("Nenhum veículo no pátio no momento")
                    )
                } else {
                    List(filtered) { v in
                        VeiculoPatioRow(veiculo: v) {
                            selectedVeiculo = v
                        }
                    }
                    .searchable(text: $searchText, prompt: "Buscar placa ou modelo")
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("Pátio Atual (\(veiculos.count))")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { Task { await load() } }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .task { await load() }
            .refreshable { await load() }
            .sheet(item: $selectedVeiculo) { v in
                SaidaRapidaSheet(veiculo: v) {
                    selectedVeiculo = nil
                    Task { await load() }
                }
                .environmentObject(db)
            }
        }
    }

    private func load() async {
        guard db.isConnected else { return }
        isLoading = true
        errorMsg = nil
        do {
            veiculos = try await db.fetchVeiculosNoPatio()
        } catch {
            errorMsg = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - VeiculoPatioRow

struct VeiculoPatioRow: View {
    let veiculo: VeiculoNoPatio
    let onSaida: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(veiculo.placa)
                        .font(.headline)
                        .fontDesign(.monospaced)
                    Spacer()
                    Text(veiculo.tempoEstadia)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.blue.opacity(0.15))
                        .foregroundStyle(.blue)
                        .cornerRadius(8)
                }

                Text("\(veiculo.marca) \(veiculo.modelo)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                if let prop = veiculo.proprietario {
                    Text(prop)
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }

                HStack(spacing: 4) {
                    if let cor = veiculo.cor {
                        Text(cor)
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                        Text("•").font(.caption2).foregroundStyle(.tertiary)
                    }
                    Text("Entrou \(veiculo.entrada, style: .time)")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }

            Button(action: onSaida) {
                Image(systemName: "arrow.up.circle")
                    .font(.title2)
                    .foregroundStyle(.red)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Registrar saída de \(veiculo.placa)")
        }
        .padding(.vertical, 4)
    }
}

// MARK: - SaidaRapidaSheet

struct SaidaRapidaSheet: View {
    let veiculo: VeiculoNoPatio
    let onSuccess: () -> Void

    @EnvironmentObject var db: DatabaseService
    @State private var observacao = ""
    @State private var isLoading = false
    @State private var errorMsg: String?
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Veículo") {
                    LabeledContent("Placa", value: veiculo.placa)
                    LabeledContent("Veículo", value: "\(veiculo.marca) \(veiculo.modelo)")
                    if let cor = veiculo.cor {
                        LabeledContent("Cor", value: cor)
                    }
                    if let prop = veiculo.proprietario {
                        LabeledContent("Proprietário", value: prop)
                    }
                    LabeledContent("Tempo no Pátio", value: veiculo.tempoEstadia)
                    LabeledContent("Entrou") {
                        Text(veiculo.entrada, format: .dateTime.day().month().hour().minute())
                    }
                }

                Section("Observação") {
                    TextField("Opcional", text: $observacao, axis: .vertical)
                        .lineLimit(3, reservesSpace: true)
                }

                if let err = errorMsg {
                    Section {
                        HStack {
                            Image(systemName: "xmark.circle.fill").foregroundStyle(.red)
                            Text(err).foregroundStyle(.red).font(.caption)
                        }
                    }
                }
            }
            .navigationTitle("Saída Rápida")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Confirmar") {
                        Task { await registrar() }
                    }
                    .disabled(isLoading)
                    .fontWeight(.semibold)
                }
            }
            .overlay {
                if isLoading {
                    Color.black.opacity(0.2).ignoresSafeArea()
                    ProgressView("Registrando...")
                        .padding()
                        .background(.regularMaterial)
                        .cornerRadius(12)
                }
            }
        }
    }

    private func registrar() async {
        isLoading = true
        errorMsg = nil
        do {
            _ = try await db.registrarSaida(
                placa: veiculo.placa,
                observacao: observacao.isEmpty ? nil : observacao
            )
            onSuccess()
            dismiss()
        } catch {
            errorMsg = error.localizedDescription
        }
        isLoading = false
    }
}
