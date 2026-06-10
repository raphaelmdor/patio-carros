import SwiftUI
import UIKit

struct SettingsView: View {
    @EnvironmentObject var db: DatabaseService
    @ObservedObject private var settings = AppSettings.shared
    @State private var isTesting = false
    @State private var testResult: String?
    @State private var testSuccess = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: 8) {
                        Circle()
                            .fill(db.isConnected ? Color.green : Color.red)
                            .frame(width: 10, height: 10)
                        Text(db.isConnected ? "Conectado" : "Desconectado")
                            .fontWeight(.medium)
                        Spacer()
                        if let err = db.connectionError, !db.isConnected {
                            Text(err)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                    }
                } header: {
                    Text("Status da Conexão")
                }

                Section {
                    LabeledTextField("Host", text: $settings.dbHost, placeholder: "192.168.1.100")
                    LabeledTextField(
                        "Porta",
                        text: Binding(
                            get: { "\(settings.dbPort)" },
                            set: { settings.dbPort = Int($0) ?? 3306 }
                        ),
                        placeholder: "3306",
                        keyboardType: .numberPad
                    )
                    LabeledTextField("Usuário", text: $settings.dbUser, placeholder: "root")
                    LabeledSecureField("Senha", text: $settings.dbPassword)
                    LabeledTextField("Banco", text: $settings.dbName, placeholder: "patio_carros")
                } header: {
                    Text("Banco de Dados MySQL")
                }

                Section {
                    Button(action: testarConexao) {
                        HStack {
                            Spacer()
                            if isTesting {
                                ProgressView()
                                    .padding(.trailing, 4)
                                Text("Testando...")
                            } else {
                                Label("Testar Conexão", systemImage: "network")
                            }
                            Spacer()
                        }
                    }
                    .disabled(isTesting)

                    if let result = testResult {
                        HStack(spacing: 8) {
                            Image(
                                systemName: testSuccess
                                    ? "checkmark.circle.fill"
                                    : "xmark.circle.fill"
                            )
                            .foregroundStyle(testSuccess ? .green : .red)
                            Text(result)
                                .font(.caption)
                                .foregroundStyle(testSuccess ? .green : .red)
                        }
                    }
                }

                Section {
                    LabeledTextField(
                        "URL",
                        text: $settings.detranApiUrl,
                        placeholder: "https://api.detran.exemplo.br",
                        keyboardType: .URL
                    )
                    LabeledSecureField("Chave API", text: $settings.detranApiKey)
                } header: {
                    Text("DETRAN API (opcional)")
                } footer: {
                    Text("Sem chave configurada, dados mock são usados automaticamente para consultas de placa.")
                }

                Section {
                    Button(role: .destructive) {
                        Task { await db.disconnect() }
                    } label: {
                        HStack {
                            Spacer()
                            Label("Desconectar", systemImage: "eject.fill")
                            Spacer()
                        }
                    }
                    .disabled(!db.isConnected)
                }
            }
            .navigationTitle("Configurações")
        }
    }

    private func testarConexao() {
        Task {
            isTesting = true
            testResult = nil
            await db.connect(
                host: settings.dbHost,
                port: settings.dbPort,
                user: settings.dbUser,
                password: settings.dbPassword,
                database: settings.dbName
            )
            testSuccess = db.isConnected
            testResult = db.isConnected
                ? "Conexão bem-sucedida!"
                : (db.connectionError ?? "Falha na conexão")
            isTesting = false
        }
    }
}

// MARK: - LabeledTextField

struct LabeledTextField: View {
    let label: String
    @Binding var text: String
    var placeholder: String = ""
    var keyboardType: UIKeyboardType = .default

    var body: some View {
        HStack {
            Text(label)
                .frame(width: 72, alignment: .leading)
                .foregroundStyle(.secondary)
            TextField(placeholder, text: $text)
                .keyboardType(keyboardType)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
        }
    }
}

// MARK: - LabeledSecureField

struct LabeledSecureField: View {
    let label: String
    @Binding var text: String

    var body: some View {
        HStack {
            Text(label)
                .frame(width: 72, alignment: .leading)
                .foregroundStyle(.secondary)
            SecureField("••••••••", text: $text)
        }
    }
}
