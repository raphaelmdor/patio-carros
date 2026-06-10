import SwiftUI

struct EntradaView: View {
    @EnvironmentObject var db: DatabaseService
    @State private var placa = ""
    @State private var dadosDetran: DadosDetran?
    @State private var observacao = ""
    @State private var isConsultando = false
    @State private var isRegistrando = false
    @State private var alertMsg: String?
    @State private var showAlert = false
    @State private var showSuccess = false
    @State private var jaEstaNoPatio = false

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
                                dadosDetran = nil
                                jaEstaNoPatio = false
                            }

                        Button(action: consultar) {
                            if isConsultando {
                                ProgressView().frame(width: 20, height: 20)
                            } else {
                                Text("Consultar")
                            }
                        }
                        .disabled(placa.count < 7 || isConsultando)
                    }

                    if jaEstaNoPatio {
                        Label("Veículo já está no pátio", systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(.orange)
                    }
                }

                if let dados = dadosDetran {
                    Section("Dados do Veículo") {
                        LabeledContent("Placa", value: dados.placa)
                        LabeledContent("Marca", value: dados.marca)
                        LabeledContent("Modelo", value: dados.modelo)
                        if let ano = dados.ano {
                            LabeledContent("Ano", value: "\(ano)")
                        }
                        if let cor = dados.cor {
                            LabeledContent("Cor", value: cor)
                        }
                        if let prop = dados.proprietario {
                            LabeledContent("Proprietário", value: prop)
                        }
                    }

                    Section("Observação") {
                        TextField("Opcional", text: $observacao, axis: .vertical)
                            .lineLimit(3, reservesSpace: true)
                    }

                    Section {
                        Button(action: registrarEntrada) {
                            HStack {
                                Spacer()
                                if isRegistrando {
                                    ProgressView()
                                } else {
                                    Label("Registrar Entrada", systemImage: "arrow.down.circle.fill")
                                }
                                Spacer()
                            }
                        }
                        .disabled(isRegistrando || jaEstaNoPatio)
                        .foregroundStyle(jaEstaNoPatio ? .gray : .green)
                    }
                }
            }
            .navigationTitle("Registrar Entrada")
            .alert("Aviso", isPresented: $showAlert) {
                Button("OK") {}
            } message: {
                Text(alertMsg ?? "")
            }
            .overlay {
                if showSuccess {
                    SuccessOverlay(message: "Entrada registrada!") {
                        showSuccess = false
                    }
                }
            }
        }
    }

    private func consultar() {
        Task {
            isConsultando = true
            dadosDetran = nil
            jaEstaNoPatio = false
            do {
                async let dados = DetranService.consultar(placa: placa)
                async let noPatio = db.verificarVeiculoNoPatio(placa: placa)
                dadosDetran = try await dados
                jaEstaNoPatio = try await noPatio
            } catch {
                alertMsg = error.localizedDescription
                showAlert = true
            }
            isConsultando = false
        }
    }

    private func registrarEntrada() {
        guard let dados = dadosDetran else { return }
        Task {
            isRegistrando = true
            do {
                try await db.registrarEntrada(
                    veiculo: dados,
                    observacao: observacao.isEmpty ? nil : observacao
                )
                placa = ""
                dadosDetran = nil
                observacao = ""
                jaEstaNoPatio = false
                showSuccess = true
            } catch {
                alertMsg = error.localizedDescription
                showAlert = true
            }
            isRegistrando = false
        }
    }
}
