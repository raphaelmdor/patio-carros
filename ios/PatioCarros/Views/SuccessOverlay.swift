import SwiftUI

struct SuccessOverlay: View {
    let message: String
    let onDismiss: () -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.35).ignoresSafeArea()
            VStack(spacing: 20) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 72))
                    .foregroundStyle(.green)

                Text(message)
                    .font(.title3.bold())
                    .multilineTextAlignment(.center)

                Button("OK", action: onDismiss)
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
            }
            .padding(36)
            .background(.background)
            .cornerRadius(24)
            .shadow(color: .black.opacity(0.25), radius: 20, x: 0, y: 8)
            .padding(.horizontal, 48)
        }
        .transition(.opacity.combined(with: .scale(scale: 0.95)))
        .animation(.spring(duration: 0.3), value: true)
    }
}
