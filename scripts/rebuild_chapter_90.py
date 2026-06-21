import os
import json
import urllib.request
import urllib.error
import ssl
import sys
import time
import re

def load_api_key():
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    key, val = line.split('=', 1)
                    if key.strip() == 'gemini-key':
                        return val.strip()
    return os.environ.get('GEMINI_API_KEY')

def call_gemini(api_key, model, system_instruction, prompt):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    headers = {'Content-Type': 'application/json'}
    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }],
        "systemInstruction": {
            "parts": [{
                "text": system_instruction
            }]
        },
        "generationConfig": {
            "responseMimeType": "application/json"
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
        ]
    }
    
    context = ssl.create_default_context()
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers=headers,
        method='POST'
    )
    
    max_retries = 5
    backoff_factor = 2
    for attempt in range(max_retries):
        try:
            with urllib.request.urlopen(req, context=context, timeout=90) as response:
                res_data = response.read().decode('utf-8')
                return json.loads(res_data)
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode('utf-8')
            print(f"HTTP Error {e.code} on attempt {attempt + 1}: {err_msg}")
            if e.code in [429, 500, 503, 504]:
                sleep_time = (backoff_factor ** attempt) * 5
                print(f"Retrying in {sleep_time} seconds...")
                time.sleep(sleep_time)
            else:
                raise
        except Exception as e:
            print(f"Error calling API on attempt {attempt + 1}: {e}")
            sleep_time = (backoff_factor ** attempt) * 5
            print(f"Retrying in {sleep_time} seconds...")
            time.sleep(sleep_time)
            if attempt == max_retries - 1:
                raise

def main():
    api_key = load_api_key()
    if not api_key:
        print("Error: gemini-key not found in .env or environment.")
        sys.exit(1)
        
    model = "gemini-3.1-flash-lite"  # Use same model as other scripts
    
    batches = [
        {"desc": "verses 1-7 (combined), 8, 9, 10, 11, 12, 13, 14, 15, 16", "expected_count": 10},
        {"desc": "verses 17, 18, 19, 20, 21, 22, 23, 24, 25, 26", "expected_count": 10},
        {"desc": "verses 27, 28, 29, 30, 31, 32, 33-34 (combined), 35, 36, 37", "expected_count": 10},
        {"desc": "verses 38, 39, 40, 41, 42, 43, 44, 45, 46, 47", "expected_count": 10},
        {"desc": "verses 48, 49, 50", "expected_count": 3}
    ]
    
    system_instruction = (
        "You are an expert scholar, Vaishnava devotee, and translator fluent in Sanskrit, English, Hindi, and Gujarati. "
        "Retrieve the original Sanskrit text (Devnagari), Roman transliteration, and English, Hindi, and Gujarati translations for the specified verses of Śrīmad-Bhāgavatam (Canto 10, Chapter 90). "
        "Ensure the Sanskrit text and transliteration match the standard Bhaktivedanta VedaBase exactly. "
        "Ensure the English, Hindi, and Gujarati translations are accurate, natural, and devotional. "
        "Lord Krishna should be referred to with reverence (e.g. 'भगवान श्रीकृष्ण' in Hindi and 'શ્રીકૃષ્ણ' in Gujarati). "
        "Respond ONLY with a JSON array of objects. Do not include any explanations, introduction, or notes. "
        "Each object in the array must contain: \n"
        "- 'verse_number': the starting verse number as an integer (e.g. 1 for 1-7, 8 for 8, 33 for 33-34)\n"
        "- 'title': string like 'Verse 1-7' or 'Verse 8' or 'Verse 33-34'\n"
        "- 'text': Devnagari Sanskrit verse text (lines separated by newlines \\n)\n"
        "- 'transliteration': Roman transliteration string\n"
        "- 'english': English translation description string\n"
        "- 'hindi': refined Hindi translation string\n"
        "- 'gujarati': refined Gujarati translation string"
    )
    
    all_reconstructed_verses = []
    
    for idx, b in enumerate(batches):
        print(f"\n--- Fetching Batch {idx+1}/{len(batches)} ({b['desc']}) ---")
        prompt = (
            f"Please retrieve the Canto 10, Chapter 90 data for the following verses: {b['desc']}.\n"
            f"Ensure you return exactly {b['expected_count']} items in a JSON array."
        )
        
        success = False
        for attempt in range(3):
            try:
                response = call_gemini(api_key, model, system_instruction, prompt)
                candidate_text = response['candidates'][0]['content']['parts'][0]['text'].strip()
                
                # Extract JSON block
                start_idx = candidate_text.find('[')
                end_idx = candidate_text.rfind(']') + 1
                if start_idx == -1 or end_idx == 0:
                    raise ValueError("JSON array boundaries not found in response")
                    
                batch_data = json.loads(candidate_text[start_idx:end_idx])
                if len(batch_data) != b['expected_count']:
                    raise ValueError(f"Expected {b['expected_count']} items, got {len(batch_data)}")
                    
                all_reconstructed_verses.extend(batch_data)
                print(f"✓ Successfully processed Batch {idx+1}")
                success = True
                break
            except Exception as e:
                print(f"Error on attempt {attempt+1}: {e}")
                time.sleep(5)
                
        if not success:
            print("Failed to fetch batch after multiple attempts. Aborting.")
            sys.exit(1)
            
    # Sort reconstructed verses by verse_number
    all_reconstructed_verses.sort(key=lambda x: x['verse_number'])
    
    # We now have 43 clean items for Chapter 90.
    # Let's construct the verse.json objects and chapter_90.json objects.
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    verse_json_path = os.path.join(base_dir, 'assets', 'verse.json')
    chapter_90_path = os.path.join(base_dir, 'assets', 'verse_translation', 'chapter_90.json')
    
    # 1. Generate chapter_90.json translations
    chapter_90_data = []
    
    def get_field(obj, possible_keys):
        # Case insensitive check and standard key fallback
        for key in possible_keys:
            if key in obj:
                return obj[key]
            for obj_key in obj.keys():
                if obj_key.lower() == key.lower():
                    return obj[obj_key]
        raise KeyError(f"Could not find any of keys {possible_keys} in object keys: {list(obj.keys())}")
        
    for v in all_reconstructed_verses:
        v_num = v.get('verse_number')
        if not v_num:
            # Fallback parse from title if verse_number is not set directly
            title = v.get('title', '')
            match = re.search(r'(\d+)', title)
            if match:
                v_num = int(match.group(1))
            else:
                raise ValueError(f"Could not determine verse number for object: {v}")
                
        vid = 109000 + v_num
        
        # In translation files, slokas look like "10.90.1-7" or "10.90.8"
        # Let's map it:
        sloka_suffix = f"{v_num}"
        if v_num == 1:
            sloka_suffix = "1-7"
        elif v_num == 33:
            sloka_suffix = "33-34"
            
        try:
            english_desc = get_field(v, ['english', 'english_translation', 'eng', 'description_english'])
            hindi_desc = get_field(v, ['hindi', 'hindi_translation', 'hin', 'description_hindi'])
            gujarati_desc = get_field(v, ['gujarati', 'gujarati_translation', 'guj', 'description_gujarati'])
        except KeyError as e:
            print(f"Error parsing verse {v_num} (Title: {v.get('title')}): {e}")
            print(f"Reconstructed object: {json.dumps(v, indent=2, ensure_ascii=False)}")
            raise
            
        chapter_90_data.append({
            "id": vid,
            "sloka": f"10.90.{sloka_suffix}",
            "verse_id": vid,
            "verseNumber": v_num,
            "languages": {
                "english": {
                    "language_id": 1,
                    "lang": "english",
                    "description": english_desc
                },
                "hindi": {
                    "language_id": 2,
                    "lang": "hindi",
                    "description": hindi_desc
                },
                "gujarati": {
                    "language_id": 3,
                    "lang": "gujarati",
                    "description": gujarati_desc
                }
            }
        })
        
    # Write translation chapter_90.json
    with open(chapter_90_path, 'w', encoding='utf-8') as f:
        json.dump(chapter_90_data, f, ensure_ascii=False, indent=4)
    print(f"\n✓ Wrote {len(chapter_90_data)} items to assets/verse_translation/chapter_90.json")
    
    # 2. Update verse.json
    with open(verse_json_path, 'r', encoding='utf-8') as f:
        all_verses = json.load(f)
        
    # Filter out existing Chapter 90 verses
    non_ch90_verses = [v for v in all_verses if v.get("chapter_number") != 90]
    
    # Create new Chapter 90 verse.json entries
    new_ch90_verses = []
    current_order = 3531
    for v in all_reconstructed_verses:
        v_num = v['verse_number']
        vid = 109000 + v_num
        
        new_ch90_verses.append({
            "chapter_id": 90,
            "chapter_number": 90,
            "externalId": vid,
            "id": vid,
            "text": v['text'],
            "title": v['title'],
            "verse_number": v_num,
            "verse_order": current_order,
            "transliteration": v['transliteration'],
            "word_meanings": ""
        })
        current_order += 1
        
    updated_all_verses = non_ch90_verses + new_ch90_verses
    
    with open(verse_json_path, 'w', encoding='utf-8') as f:
        json.dump(updated_all_verses, f, ensure_ascii=False, indent=4)
    print(f"✓ Updated assets/verse.json with {len(new_ch90_verses)} Chapter 90 items (deduplicated & filled).")
    
if __name__ == "__main__":
    main()
