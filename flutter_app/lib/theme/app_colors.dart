import 'package:flutter/material.dart';

class AppColors {
  static const primary = Color(0xFF4AABDB);
  static const naverGreen = Color(0xFF03C75A);

  // 다크모드에서도 유지되는 태그 색상
  static const tagDaily = Color(0xFF87CEEB);
  static const tagLong = Color(0xFF9B7FD4);
  static const tagRace = Color(0xFFFF6B6B);
  static const tagBeginner = Color(0xFF56C786);
  static const tagRecovery = Color(0xFF4ECDC4);
  static const tagTrail = Color(0xFF8B6914);
  static const tagTempo = Color(0xFFFF9F43);
  static const tagInterval = Color(0xFFEE5A24);
}

extension AppTheme on BuildContext {
  ColorScheme get cs => Theme.of(this).colorScheme;
  bool get isDark => Theme.of(this).brightness == Brightness.dark;

  Color get cardBg => isDark ? const Color(0xFF1E1E1E) : Colors.white;
  Color get pageBg => isDark ? const Color(0xFF121212) : const Color(0xFFF8F8F8);
  Color get borderColor => isDark ? const Color(0xFF2C2C2C) : const Color(0xFFE0E0E0);
  Color get subtitleColor => isDark ? Colors.white60 : Colors.black54;
  Color get textColor => isDark ? Colors.white : Colors.black;
  Color get explanationBg => isDark ? const Color(0xFF1A2A33) : const Color(0xFFFFF3EE);
}
