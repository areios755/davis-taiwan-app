# Claude Code Knowledge Extraction Prompt

Copy-paste this into Claude Code after placing your files in knowledge-raw/:

Read all files in knowledge-raw/ (pdfs/, chats/, web/) and extract Davis grooming knowledge into structured JSON.

## Output 1: knowledge-out/products-extracted.json
Array of products with: id, name_zh, name_en, name_cn, name_ja, category, series, description_zh, ingredients, dilution, dwell_time, use_cases[], coat_types[], usage_steps[], warnings, sizes[], source_file

## Output 2: knowledge-out/breeds-extracted.json
Array of breed grooming guides with: breed_zh, breed_en, pet_type, coat_type, coat_characteristics, common_issues[], washing_frequency, recommended_products (basic/advanced/signature arrays), grooming_tips[], seasonal_notes (spring/summer/autumn/winter), source_file

## Output 3: knowledge-out/knowledge-extracted.json
Array of general grooming knowledge with: topic, content, category (technique/safety/seasonal/skin_condition/coat_care/general), tags[], source_file

## Rules
- Read EVERY file in knowledge-raw/ subdirectories
- Merge duplicate info from multiple sources
- Keep specific numbers (dilution ratios, times, temperatures)
- Do NOT invent data - only extract what exists
- Output valid JSON, Traditional Chinese for zh fields
- Write knowledge-out/extraction-summary.md with file list and counts
