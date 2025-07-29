import csv
import json
import re

# Load CSV
csv_path = "Kopie van Scarlet and Violet - SV10 - Destined Rivals.csv"
json_path = "cards.json"
output_path = "cards_updated.json"

# Load image URLs and numbers from your existing cards.json
with open(json_path, encoding="utf-8") as f:
    image_data = {str(card["number"]): card["imageUrl"] for card in json.load(f)}

# Helper to auto-tag
def get_tags(name):
    tags = []
    if "Ethan" in name:
        tags.append(["Ethan"])
    if "Cynthia" in name:
        tags.append(["Cynthia"])
    if "Team Rocket" in name:
        tags.append(["Team Rocket"])
    if "EX" in name:
        tags.append(["EX"])
    # Add more auto-tags as needed
    return tags

cards = []
with open(csv_path, encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        num = row["#"].strip()
        name = row["Name"].strip()
        if not num.isdigit() or not name:
            continue
        image_url = image_data.get(num, "")
        tags = get_tags(name)
        cards.append({
            "name": name,
            "number": int(num),
            "imageUrl": image_url,
            "tags": tags
        })

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(cards, f, indent=2, ensure_ascii=False)

print(f"Generated {output_path} with {len(cards)} cards.")