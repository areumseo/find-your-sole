import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as path_helper;

class ShoesDbService {
  static Database? _db;

  static Future<Database> get db async {
    _db ??= await openDatabase(
      path_helper.join(await getDatabasesPath(), 'my_shoes.db'),
      onCreate: (db, version) => db.execute(
        'CREATE TABLE shoes(id INTEGER PRIMARY KEY AUTOINCREMENT, '
        'name TEXT, brand TEXT, purchased_at TEXT, km REAL)',
      ),
      version: 1,
    );
    return _db!;
  }

  static Future<void> addShoe({
    required String name,
    required String brand,
  }) async {
    final database = await db;
    await database.insert('shoes', {
      'name': name,
      'brand': brand,
      'purchased_at': DateTime.now().toIso8601String().substring(0, 10),
      'km': 0.0,
    });
  }

  static Future<List<Map<String, dynamic>>> getAll() async {
    final database = await db;
    return database.query('shoes', orderBy: 'purchased_at DESC');
  }

  static Future<void> updateKm(int id, double km) async {
    final database = await db;
    await database.update('shoes', {'km': km}, where: 'id = ?', whereArgs: [id]);
  }

  static Future<void> deleteShoe(int id) async {
    final database = await db;
    await database.delete('shoes', where: 'id = ?', whereArgs: [id]);
  }
}
