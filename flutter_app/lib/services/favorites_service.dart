import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/shoe.dart';

class FavoritesService {
  static const _key = 'favorites';

  static Future<List<Map<String, dynamic>>> getAll() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(_key) ?? [];
    return raw.map((e) => jsonDecode(e) as Map<String, dynamic>).toList();
  }

  static Future<bool> isFavorite(int shoeId) async {
    final all = await getAll();
    return all.any((e) => e['id'] == shoeId);
  }

  static Future<void> toggle(Shoe shoe) async {
    final prefs = await SharedPreferences.getInstance();
    final all = await getAll();
    final exists = all.any((e) => e['id'] == shoe.id);
    if (exists) {
      all.removeWhere((e) => e['id'] == shoe.id);
    } else {
      all.add({
        'id': shoe.id,
        'name': shoe.name,
        'brand': shoe.brand,
        'price': shoe.price,
        'weight_g': shoe.weightG,
        'drop_mm': shoe.dropMm,
        'cushion': shoe.cushion,
        'terrain': shoe.terrain,
        'arch': shoe.arch,
        'pronation': shoe.pronation,
        'use_case': shoe.useCase,
        'weekly_km': shoe.weeklyKm,
        'width': shoe.width,
        'tags': shoe.tags,
        'score': shoe.score,
        'naver_url': shoe.naverUrl,
      });
    }
    await prefs.setStringList(_key, all.map((e) => jsonEncode(e)).toList());
  }
}
