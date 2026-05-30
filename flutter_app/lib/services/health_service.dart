import 'package:health/health.dart';

class HealthService {
  static final _health = Health();

  static Future<bool> requestPermissions() async {
    final types = [HealthDataType.WORKOUT, HealthDataType.DISTANCE_WALKING_RUNNING];
    final permissions = types.map((_) => HealthDataAccess.READ).toList();
    return await _health.requestAuthorization(types, permissions: permissions);
  }

  static Future<double> getRunningKmSince(DateTime since) async {
    try {
      final now = DateTime.now();
      final data = await _health.getHealthDataFromTypes(
        startTime: since,
        endTime: now,
        types: [HealthDataType.DISTANCE_WALKING_RUNNING],
      );
      final deduped = Health().removeDuplicates(data);
      double totalMeters = 0;
      for (final point in deduped) {
        final value = point.value;
        if (value is NumericHealthValue) {
          totalMeters += value.numericValue.toDouble();
        }
      }
      return totalMeters / 1000; // km
    } catch (_) {
      return 0;
    }
  }
}
