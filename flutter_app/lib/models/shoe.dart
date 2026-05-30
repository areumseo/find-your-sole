class Shoe {
  final int id;
  final String name;
  final String brand;
  final int price;
  final int weightG;
  final int dropMm;
  final String cushion;
  final List<String> terrain;
  final List<String> arch;
  final List<String> pronation;
  final List<String> useCase;
  final String weeklyKm;
  final String width;
  final List<String> tags;
  final int score;
  final String naverUrl;

  Shoe({
    required this.id,
    required this.name,
    required this.brand,
    required this.price,
    required this.weightG,
    required this.dropMm,
    required this.cushion,
    required this.terrain,
    required this.arch,
    required this.pronation,
    required this.useCase,
    required this.weeklyKm,
    required this.width,
    required this.tags,
    required this.score,
    required this.naverUrl,
  });

  factory Shoe.fromJson(Map<String, dynamic> json) => Shoe(
        id: json['id'],
        name: json['name'],
        brand: json['brand'],
        price: json['price'],
        weightG: json['weight_g'],
        dropMm: json['drop_mm'],
        cushion: json['cushion'],
        terrain: List<String>.from(json['terrain']),
        arch: List<String>.from(json['arch']),
        pronation: List<String>.from(json['pronation']),
        useCase: List<String>.from(json['use_case']),
        weeklyKm: json['weekly_km'],
        width: json['width'],
        tags: List<String>.from(json['tags']),
        score: json['score'],
        naverUrl: json['naver_url'],
      );
}
