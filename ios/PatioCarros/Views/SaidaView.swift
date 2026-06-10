import SwiftUI

struct SaidaView: View {
    @EnvironmentObject var db: DatabaseService
    @State private var placa = ""
    @State private var observacao = ""
    @State private var isVerificando = false
    @State private var isRegistrando = false
    @State private var veiculoEncontrado = false
    @State private var veiculoInfo: VeiculoNoPatio?
    @State private var alertMsg: String?
    @State private var showAlert = false
    @State private var showSuccess = false
    @State private var resultadoSaida: (entrada: Date, saida: Date)?
    @State private var hasSearched = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Placa do Veículo") {
                    HStack {
                        TextField("ABC1D23", text: $placa)
                            .textInputAutocapitalization(.characters)
                            .autocorrectionDisabled()
                            .onChange(of: placa) { _, newValue in
                                placa = newValue.uppercased()
                                veiculoEncontrado = false
                                veiculoInfo = nil
                                hasSearched = false
                            }

                        Button(action: verificar) {
                            if isVerificando {
                                ProgressView().frame(width: 20, height: 20)
                            } else {
                                Text("Verificar")
                            }
                        }
                        .disabled(placa.count < 7 || isVerificando)
                    }

                    if hasSearched && !veiculoEncontrado && !isVerificando {
                        Label("Veículo não encontrado no pátio", systemImage: "car.fill")
                            .foregroundStyle(.secondary)
                            .font(.caption)
                    }
                }

                if let info = veiculoInfo {
                    Section("Veículo no Pátio") {
                        LabeledContent("Placa", value: info.placa)
                        LabeledContent("Veículo", value: "\(info.marca) \(info.modelo)")
                        if let cor = info.cor {
                            LabeledContent("Cor", value: cor)
                        }
                        if let prop = info.proprietario {
                            LabeledContent("Proprietário", value: prop)
                        }
                        LabeledContent("Entrada") {
                            Text(info.entrada, format: .dateTime.day().month().year().hour().minute())
                        }
                        LabeledContent("Tempo no Pátio", value: info.tempoEstadia)
                    }

                    Section("Observação") {
                        TextField("Opcional", text: $observacao, axis: .vertical)
                            .lineLimit(3, reservesSpace: true)
                    }

                    Section {
                        Button(action: registrarSaida) {
                            HStack {
                                Spacer()
                                if isRegistrando {
                                    ProgressView()
                                } else {
                                    Label("Registrar Saída", systemImage: "arrow.up.circle.fill")
                                }
                                Spacer()
                            }
                        }
                        .disabled(isRegistrando)
                        .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Registrar Saída")
            .alert("Aviso", isPresented: $showAlert) {
                Button("OK") {}
            } message: {
                Text(alertMsg ?? "")
            }
            .overlay {
                if showSuccess, let r = resultadoSaida {
                    SaidaSuccessOverlay(entrada: r.entrada, saida: r.saida) {
                        showSuccess = false
                        resultadoSaida = nil
                    }
                }
            }
        }
    }

    private func verificar() {
        Task {
            isVerificando = true
            veiculoInfo = nil
            veiculoEncontrado = false
            hasSearched = false
            do {
                let todos = try await db.fetchVeiculosNoPatio()
                veiculoInfo = todos.first { $0.placa == placa }
                veiculoEncontrado = veiculoInfo != nil
            } catch {
                alertMsg = error.localizedDescription
                showAlert = true
            }
            hasSearched = true
            isVerificando = false
        }
    }

    private func registrarSaida() {
        Task {
            isRegistrando = true
            do {
                let r = try await db.registrarSaida(
                    placa: placa,
                    observacao: observacao.isEmpty ? nil : observacao
                )
                resultadoSaida = r
                placa = ""
                observacao = ""
                veiculoInfo = nil
                veiculoEncontrado = false
                hasSearched = false
                showSuccess = true
            } catch {
                alertMsg = error.localizedDescription
                showAlert = true
            }
            isRegistrando = false
        }
    }
}

// MARK: - SaidaSuccessOverlay

struct SaidaSuccessOverlay: View {
    let entrada: Date
    let saida: Date
    let onDismiss: () -> Void

    var tempoTotal: String {
        let diff = saida.timeIntervalSince(entrada)
        let h = Int(diff) / 3600
        let m = (Int(diff) % 3600) / 60
        return h > 0 ? "\(h)h \(m)min" : "\(m)min"
    }

    var body: some View {
        ZStack {
            Color.black.opacity(0.4).ignoresSafeArea()
            VStack(spacing: 20) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 64))
                    .foregroundStyle(.green)

                Text("Saída Registrada!")
                    .font(.title2.bold())

                VStack(spacing: 8) {
                    HStack {
                        Text("Entrada").foregroundStyle(.secondary)
                        Spacer()
                        Text(entrada, format: .dateTime.hour().minute())
                    }
                    HStack {
                        Text("Saída").foregroundStyle(.secondary)
                        Spacer()
                        Text(saida, format: .dateTime.hour().minute())
                    }
                    Divider()
                    HStack {
                        Text("Tempo Total").fontWeight(.semibold)
                        Spacer()
                        Text(tempoTotal).fontWeight(.semibold)
                    }
                }
                .padding()
                .background(.regularMaterial)
                .cornerRadius(12)

                Button("Fechar", action: onDismiss)
                    .buttonStyle(.borderedProminent)
            }
            .padding(32)
            .background(.background)
            .cornerRadius(20)
            .shadow(radius: 20)
            .padding()
        }
    }
}
