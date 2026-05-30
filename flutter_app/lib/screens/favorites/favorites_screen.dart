import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../l10n/app_localizations.dart';
import '../../models/shoe.dart';
import '../../services/favorites_service.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  List<Map<String, dynamic>> _favorites = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final all = await FavoritesService.getAll();
    setState(() => _favorites = all);
  }

  Future<void> _remove(int id) async {
    final shoe = Shoe.fromJson(_favorites.firstWhere((e) => e['id'] == id));
    await FavoritesService.toggle(shoe);
    _load();
  }

  static const _tagColors = {
    '데일리': Color(0xFF87CEEB),
    '장거리': Color(0xFF9B7FD4),
    '레이스': Color(0xFFFF6B6B),
    '입문': Color(0xFF56C786),
    '회복런': Color(0xFF4ECDC4),
    '트레일': Color(0xFF8B6914),
    '템포': Color(0xFFFF9F43),
    '인터벌': Color(0xFFEE5A24),
  };

  String _priceRange(int price, bool isEn) {
    if (price < 100000) return isEn ? 'Under ₩100,000' : '10만원 미만';
    if (price < 150000) return isEn ? '₩100,000–150,000' : '10~15만원대';
    if (price < 200000) return isEn ? '₩150,000–200,000' : '15~20만원대';
    return isEn ? '₩200,000+' : '20만원 이상';
  }

  static const _tagEnMap = {
    '데일리': 'Daily', '장거리': 'Long Run', '레이스': 'Race',
    '입문': 'Beginner', '회복런': 'Recovery', '트레일': 'Trail',
    '템포': 'Tempo', '인터벌': 'Interval',
  };

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context)!;
    final isEn = Localizations.localeOf(context).languageCode == 'en';

    return Scaffold(
      appBar: AppBar(
        title: Text(l.tabFavorites),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      backgroundColor: const Color(0xFFF8F8F8),
      body: _favorites.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('🤍', style: TextStyle(fontSize: 48)),
                  const SizedBox(height: 12),
                  Text(l.favoritesEmpty,
                      style: const TextStyle(color: Colors.black45)),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _favorites.length,
              itemBuilder: (context, index) {
                final data = _favorites[index];
                final useCase = List<String>.from(data['use_case']);
                final naverUrl = data['naver_url'] as String;

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(color: Colors.grey.shade200),
                  ),
                  color: Colors.white,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    data['name'],
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(data['brand'],
                                      style: const TextStyle(
                                          color: Colors.black54, fontSize: 13)),
                                ],
                              ),
                            ),
                            Text(
                              isEn
                                  ? _priceRange(data['price'] as int, true)
                                  : _priceRange(data['price'] as int, false),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                            const SizedBox(width: 8),
                            IconButton(
                              icon: const Icon(Icons.favorite,
                                  color: Color(0xFF4AABDB)),
                              onPressed: () => _remove(data['id']),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 4,
                          runSpacing: 4,
                          children: useCase.map((tag) {
                            final color =
                                _tagColors[tag] ?? Colors.grey.shade400;
                            final label =
                                isEn ? (_tagEnMap[tag] ?? tag) : tag;
                            return Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: color.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(label,
                                  style: TextStyle(
                                    color: color,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  )),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: () => launchUrl(Uri.parse(naverUrl),
                                mode: LaunchMode.externalApplication),
                            icon: const Icon(Icons.shopping_cart_outlined,
                                size: 16),
                            label: Text(l.naverShopping),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFF03C75A),
                              side:
                                  const BorderSide(color: Color(0xFF03C75A)),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
