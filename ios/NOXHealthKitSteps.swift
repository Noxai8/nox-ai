import Foundation
import HealthKit

/// iOS native-only adapter. Must be invoked from a signed iOS target with HealthKit entitlement.
/// Never returns step samples, location or identifiers: only today's aggregate count.
@MainActor
final class NOXHealthKitSteps {
    private let store = HKHealthStore()

    enum HealthError: Error {
        case unavailable
        case noData
    }

    func requestStepReadAccess() async throws {
        guard HKHealthStore.isHealthDataAvailable() else { throw HealthError.unavailable }
        let steps = HKObjectType.quantityType(forIdentifier: .stepCount)!
        try await store.requestAuthorization(toShare: [], read: [steps])
    }

    func todaySteps() async throws -> Int {
        guard HKHealthStore.isHealthDataAvailable() else { throw HealthError.unavailable }
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: Date())
        let type = HKQuantityType.quantityType(forIdentifier: .stepCount)!
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: [.strictStartDate])
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: [.cumulativeSum]) { _, result, error in
                if let error { continuation.resume(throwing: error); return }
                // nil is unknown, not zero. Permission denial can also produce no samples.
                guard let quantity = result?.sumQuantity() else {
                    continuation.resume(throwing: HealthError.noData)
                    return
                }
                continuation.resume(returning: max(0, Int(quantity.doubleValue(for: .count()).rounded())))
            }
            store.execute(query)
        }
    }
}
