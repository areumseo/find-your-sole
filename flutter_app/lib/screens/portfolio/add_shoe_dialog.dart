import 'package:flutter/material.dart';
import '../../l10n/app_localizations.dart';
import '../../services/shoes_db_service.dart';

Future<void> showAddShoeDialog(
  BuildContext context, {
  String initialName = '',
  String initialBrand = '',
}) async {
  final nameController = TextEditingController(text: initialName);
  final brandController = TextEditingController(text: initialBrand);

  if (!context.mounted) return;

  await showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (context) => Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            AppLocalizations.of(context)!.addShoe,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: nameController,
            decoration: InputDecoration(
              labelText: AppLocalizations.of(context)!.shoeName,
              border: const OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: brandController,
            decoration: InputDecoration(
              labelText: AppLocalizations.of(context)!.brand,
              border: const OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () async {
                if (nameController.text.isNotEmpty) {
                  await ShoesDbService.addShoe(
                    name: nameController.text,
                    brand: brandController.text,
                  );
                  if (context.mounted) {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          AppLocalizations.of(context)!.shoeAdded(nameController.text),
                        ),
                        duration: const Duration(seconds: 2),
                      ),
                    );
                  }
                }
              },
              style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF4AABDB)),
              child: Text(AppLocalizations.of(context)!.addShoe),
            ),
          ),
        ],
      ),
    ),
  );
}
