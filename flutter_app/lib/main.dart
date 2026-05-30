import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:google_fonts/google_fonts.dart';
import 'l10n/app_localizations.dart';
import 'screens/recommend/recommend_tab.dart';
import 'screens/portfolio/my_shoes.dart';
import 'screens/favorites/favorites_screen.dart';
import 'screens/about/about_screen.dart';

void main() {
  runApp(const FindYourSoleApp());
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
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4AABDB),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
        textTheme: GoogleFonts.notoSansKrTextTheme().copyWith(
          titleLarge: GoogleFonts.notoSansKr(fontWeight: FontWeight.w900),
          titleMedium: GoogleFonts.notoSansKr(fontWeight: FontWeight.w800),
          titleSmall: GoogleFonts.notoSansKr(fontWeight: FontWeight.w700),
        ),
        appBarTheme: AppBarTheme(
          titleTextStyle: GoogleFonts.notoSansKr(
            fontWeight: FontWeight.w800,
            fontSize: 18,
            color: Colors.black,
          ),
        ),
      ),
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
        }
        // 오른쪽→왼쪽 스와이프 = 앞으로
        if (v < -300) {
          if (_currentIndex == 0) setState(() => _currentIndex = 1); // 추천 → 찜
          if (_currentIndex == 1) setState(() => _currentIndex = 2); // 찜 → 내 신발
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
