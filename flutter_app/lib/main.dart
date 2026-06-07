import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:google_fonts/google_fonts.dart';
import 'l10n/app_localizations.dart';
import 'theme/app_colors.dart';
import 'screens/recommend/recommend_tab.dart';
import 'screens/portfolio/my_shoes.dart';
import 'screens/favorites/favorites_screen.dart';
import 'screens/about/about_screen.dart';

void main() {
  runApp(const FindYourSoleApp());
}

ThemeData _buildTheme(Brightness brightness) {
  final isDark = brightness == Brightness.dark;
  return ThemeData(
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primary,
      brightness: brightness,
    ),
    useMaterial3: true,
    scaffoldBackgroundColor: isDark ? const Color(0xFF121212) : const Color(0xFFF8F8F8),
    textTheme: GoogleFonts.notoSansKrTextTheme(
      isDark ? ThemeData.dark().textTheme : ThemeData.light().textTheme,
    ).copyWith(
      titleLarge: GoogleFonts.notoSansKr(fontWeight: FontWeight.w900),
      titleMedium: GoogleFonts.notoSansKr(fontWeight: FontWeight.w800),
      titleSmall: GoogleFonts.notoSansKr(fontWeight: FontWeight.w700),
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
      foregroundColor: isDark ? Colors.white : Colors.black,
      elevation: 0,
      titleTextStyle: GoogleFonts.notoSansKr(
        fontWeight: FontWeight.w800,
        fontSize: 18,
        color: isDark ? Colors.white : Colors.black,
      ),
    ),
    cardColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
  );
}

class FindYourSoleApp extends StatelessWidget {
  const FindYourSoleApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Find Your Sole',
      debugShowCheckedModeBanner: false,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('ko'),
        Locale('en'),
      ],
      theme: _buildTheme(Brightness.light),
      darkTheme: _buildTheme(Brightness.dark),
      themeMode: ThemeMode.system,
      home: const MainScreen(),
    );
  }
}

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onHorizontalDragEnd: (details) {
        final v = details.primaryVelocity ?? 0;
        // 왼쪽→오른쪽 스와이프 = 뒤로
        if (v > 300) {
          if (_currentIndex == 1) setState(() => _currentIndex = 0); // 찜 → 추천
          if (_currentIndex == 2) setState(() => _currentIndex = 1); // 내 신발 → 찜
          if (_currentIndex == 3) setState(() => _currentIndex = 2); // About → 내 신발
        }
        // 오른쪽→왼쪽 스와이프 = 앞으로
        if (v < -300) {
          if (_currentIndex == 0) setState(() => _currentIndex = 1); // 추천 → 찜
          if (_currentIndex == 1) setState(() => _currentIndex = 2); // 찜 → 내 신발
          if (_currentIndex == 2) setState(() => _currentIndex = 3); // 내 신발 → About
        }
      },
      child: Scaffold(
        body: IndexedStack(
          index: _currentIndex,
          children: [
            RecommendTab(
              onSwipeToFavorites: () => setState(() => _currentIndex = 1),
            ),
            _currentIndex == 1 ? const FavoritesScreen() : const SizedBox.shrink(),
            _currentIndex == 2 ? const MyShoesScreen() : const SizedBox.shrink(),
            _currentIndex == 3 ? const AboutScreen() : const SizedBox.shrink(),
          ],
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _currentIndex,
          onDestinationSelected: (index) => setState(() => _currentIndex = index),
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.search),
            label: AppLocalizations.of(context)!.tabRecommend,
          ),
          NavigationDestination(
            icon: const Icon(Icons.favorite_border),
            selectedIcon: const Icon(Icons.favorite),
            label: AppLocalizations.of(context)!.tabFavorites,
          ),
          NavigationDestination(
            icon: const Icon(Icons.sports_score),
            label: AppLocalizations.of(context)!.tabMyShoes,
          ),
          NavigationDestination(
            icon: const Icon(Icons.info_outline),
            selectedIcon: const Icon(Icons.info),
            label: AppLocalizations.of(context)!.tabAbout,
          ),
        ],
      ),
    ),
    );
  }
}
