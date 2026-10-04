import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Stores the user's shoe collection in shared_preferences as a JSON list.
///
/// This used sqflite, which has no web support. The collection is a handful of
/// rows with four fields, so SQL bought us nothing that a JSON list does not,
/// and shared_preferences works on every platform including web.
class ShoesDbService {
  static const _key = 'my_shoes';

  static Future<List<Map<String, dynamic>>> _read(SharedPreferences prefs) async {
    final raw = prefs.getStringList(_key) ?? [];
    return raw.map((e) => jsonDecode(e) as Map<String, dynamic>).toList();
  }

  static Future<void> _write(
    SharedPreferences prefs,
    List<Map<String, dynamic>> shoes,
  ) async {
    await prefs.setStringList(_key, shoes.map(jsonEncode).toList());
  }

  static Future<void> addShoe({required String name, required String brand}) async {
    final prefs = await SharedPreferences.getInstance();
    final all = await _read(prefs);
    // Mimic AUTOINCREMENT: ids must stay unique even after deletions, so take
    // the highest id ever used rather than the row count.
    final nextId = all.fold<int>(0, (max, e) => (e['id'] as int) > max ? e['id'] as int : max) + 1;
    all.add({
      'id': nextId,
      'name': name,
      'brand': brand,
      'purchased_at': DateTime.now().toIso8601String().substring(0, 10),
      'km': 0.0,
    });
    await _write(prefs, all);
  }

  static Future<List<Map<String, dynamic>>> getAll() async {
    final prefs = await SharedPreferences.getInstance();
    final all = await _read(prefs);
    all.sort((a, b) => (b['purchased_at'] as String).compareTo(a['purchased_at'] as String));
    return all;
  }

  static Future<void> updateKm(int id, double km) async {
    final prefs = await SharedPreferences.getInstance();
    final all = await _read(prefs);
    for (final shoe in all) {
      if (shoe['id'] == id) {
        shoe['km'] = km;
      }
    }
    await _write(prefs, all);
  }

  static Future<void> deleteShoe(int id) async {
    final prefs = await SharedPreferences.getInstance();
    final all = await _read(prefs);
    all.removeWhere((e) => e['id'] == id);
    await _write(prefs, all);
  }
}
