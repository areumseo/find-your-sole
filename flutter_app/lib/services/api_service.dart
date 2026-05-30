import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/shoe.dart';

class ApiService {
  static const String _baseUrl = 'https://find-your-sole.onrender.com';

  static Future<List<Shoe>> recommendBeginner({
    required String frequency,
    required String terrain,
    required String pain,
    required bool wideFoot,
    required int budget,
    int? weightKg,
    List<String> brandFilter = const [],
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/recommend/beginner'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'frequency': frequency,
        'terrain': terrain,
        'pain': pain,
        'wide_foot': wideFoot,
        'budget': budget,
        if (weightKg != null) 'weight_kg': weightKg,
        'brand_filter': brandFilter,
      }),
    );
    if (response.statusCode != 200) throw Exception('추천 실패');
    final List data = jsonDecode(utf8.decode(response.bodyBytes));
    return data.map((e) => Shoe.fromJson(e)).toList();
  }

  static Future<List<Shoe>> recommendExpert({
    required String arch,
    required String pronation,
    required String terrain,
    required List<String> useCase,
    required String cushion,
    required String width,
    required int weeklyKm,
    required int budget,
    int? weightKg,
    List<String> brandFilter = const [],
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/recommend/expert'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'arch': arch,
        'pronation': pronation,
        'terrain': terrain,
        'use_case': useCase,
        'cushion': cushion,
        'width': width,
        'weekly_km': weeklyKm,
        'budget': budget,
        if (weightKg != null) 'weight_kg': weightKg,
        'brand_filter': brandFilter,
      }),
    );
    if (response.statusCode != 200) throw Exception('추천 실패');
    final List data = jsonDecode(utf8.decode(response.bodyBytes));
    return data.map((e) => Shoe.fromJson(e)).toList();
  }

  static Future<String> explainShoe({
    required Map<String, dynamic> shoe,
    required Map<String, dynamic> prefs,
    String locale = 'ko',
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/explain'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'shoe': shoe, 'prefs': prefs, 'locale': locale}),
    );
    if (response.statusCode != 200) throw Exception('설명 실패');
    return jsonDecode(utf8.decode(response.bodyBytes))['explanation'];
  }
}
