// HealthKit 연동은 macOS 26.5 호환 이슈로 임시 비활성화
// Homebrew/Ruby 업데이트 후 재활성화 예정
class HealthService {
  static Future<bool> requestPermissions() async => false;
  static Future<double> getRunningKmSince(DateTime since) async => 0;
}
