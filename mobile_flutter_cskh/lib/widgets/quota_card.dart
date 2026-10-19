import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

/// Widget tái sử dụng hiển thị thẻ đo lường hạn mức Quota
class QuotaCard extends StatelessWidget {
  final String title;
  final int current;
  final int max;
  final IconData icon;
  final Color accentColor;
  final String unit;

  const QuotaCard({
    super.key,
    required this.title,
    required this.current,
    required this.max,
    required this.icon,
    this.accentColor = AppColors.primary,
    this.unit = '',
  });

  @override
  Widget build(BuildContext context) {
    final double percent = max > 0 ? (current / max).clamp(0.0, 1.0) : 0.0;
    final bool isNearLimit = percent >= 0.8;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Icon(icon, color: accentColor, size: 20),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                '$current',
                style: const TextStyle(
                  color: AppColors.textMain,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                ' / $max $unit',
                style: const TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 14,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Thanh tiến trình LinearProgressIndicator
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: percent,
              minHeight: 6,
              backgroundColor: const Color(0xFF0F172A),
              valueColor: AlwaysStoppedAnimation<Color>(
                isNearLimit ? AppColors.danger : accentColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
