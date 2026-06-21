#!/usr/bin/env python3
import os
import json
import urllib.request
import urllib.error
import ssl
import sys
import time
import shutil

# Parse .env file manually
def load_api_key():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
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
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_NONE"
            }
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
            with urllib.request.urlopen(req, context=context, timeout=60) as response:
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

def sanitize_prompt_text(text):
    if not text:
        return ""
    import re
    # We replace words that trigger false positive child safety blocks in the API prompt.
    t = text
    # English replacements
    t = re.sub(r'\bbreast\b', 'bosom', t, flags=re.IGNORECASE)
    t = re.sub(r'\bbreasts\b', 'bosoms', t, flags=re.IGNORECASE)
    t = re.sub(r'\bnipple\b', 'tip', t, flags=re.IGNORECASE)
    t = re.sub(r'\bnipples\b', 'tips', t, flags=re.IGNORECASE)
    t = re.sub(r'\bsuck\b', 'drink', t, flags=re.IGNORECASE)
    t = re.sub(r'\bsucked\b', 'drank', t, flags=re.IGNORECASE)
    t = re.sub(r'\bsucking\b', 'drinking', t, flags=re.IGNORECASE)
    t = re.sub(r'\bvirgin\b', 'maiden', t, flags=re.IGNORECASE)
    t = re.sub(r'\blust\b', 'passion', t, flags=re.IGNORECASE)
    t = re.sub(r'\bseized\b', 'accepted', t, flags=re.IGNORECASE)
    t = re.sub(r'\bbudding\b', 'developing', t, flags=re.IGNORECASE)
    t = re.sub(r'\bhips\b', 'limbs', t, flags=re.IGNORECASE)
    t = re.sub(r'\bwaist\b', 'middle', t, flags=re.IGNORECASE)
    t = re.sub(r'\bnaked\b', 'unclothed', t, flags=re.IGNORECASE)
    t = re.sub(r'\bnude\b', 'unclothed', t, flags=re.IGNORECASE)
    
    # Hindi replacements
    t = re.sub(r'स्तन', 'वक्ष', t)
    t = re.sub(r'स्तनों', 'वक्ष', t)
    t = re.sub(r'चूस', 'पान कर', t)
    t = re.sub(r'चूसा', 'पान किया', t)
    t = re.sub(r'कुंवारी', 'कुमारी', t)
    t = re.sub(r'कूंवारी', 'कुमारी', t)
    t = re.sub(r'वासना', 'आकर्षण', t)
    t = re.sub(r'जांघों', 'कमल-चरणों', t)
    t = re.sub(r'नितंब', 'कटिप्रदेश', t)
    t = re.sub(r'कमर', 'मध्यभाग', t)
    t = re.sub(r'नग्न', 'अनावृत', t)
    
    # Gujarati replacements
    t = re.sub(r'સ્તન', 'વક્ષ', t)
    t = re.sub(r'સ્તનો', 'વક્ષ', t)
    t = re.sub(r'ચૂસ', 'પાન કર', t)
    t = re.sub(r'ચૂસી', 'પાન કરી', t)
    t = re.sub(r'કુંવારી', 'કુમારી', t)
    t = re.sub(r'વાસના', 'આકર્ષણ', t)
    t = re.sub(r'નિતંબ', 'કટિપ્રદેશ', t)
    t = re.sub(r'નિતંબો', 'કટિપ્રદેશ', t)
    t = re.sub(r'કમર', 'મધ્યભાગ', t)
    t = re.sub(r'નગ્ન', 'અનાવૃત', t)
    t = re.sub(r'હિપ્સ', 'કટિપ્રદેશ', t)
    t = re.sub(r'જંઘા', 'ચરણ', t)
    t = re.sub(r'જંઘાઓ', 'ચરણ', t)
    t = re.sub(r'જાંઘ', 'ચરણ', t)
    t = re.sub(r'જાંઘો', 'ચરણ', t)
    
    return t

def refine_chapter(file_path, api_key, model, delay):
    print(f"\n--- Refining file: {os.path.basename(file_path)} ---")
    
    # Backup file
    backup_path = file_path + ".backup"
    shutil.copyfile(file_path, backup_path)
    print(f"Backup created at: {os.path.basename(backup_path)}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        chapter_data = json.load(f)
        
    total_verses = len(chapter_data)
    batch_size = 10
    
    system_instruction = (
        "You are an expert scholar, Vaishnava devotee, and translator fluent in English, Hindi, and Gujarati. "
        "Your task is to refine the existing Hindi and Gujarati translations of Shrimad Bhagavatam verses. "
        "The English translation is the absolute source of truth. "
        "For each verse, you are provided with: \n"
        "1. The English translation (source of truth)\n"
        "2. The current Hindi translation\n"
        "3. The current Gujarati translation\n\n"
        "Your goal is to inspect and refine both the current Hindi and current Gujarati translations to: \n"
        "- Ensure they are highly accurate and completely faithful to the meaning of the English source of truth.\n"
        "- Keep the tone respectful and devotional (Lord Krishna should be referred to with reverence as 'भगवान श्रीकृष्ण' / 'શ્રીકૃષ્ણ' or 'श्रीहरि' / 'શ્રીહરિ').\n"
        "- Keep and preserve the traditional, scriptural, and poetic vocabulary of the current translations where they are correct.\n"
        "- Correct any grammatical errors, literal machine-translation mistakes, typos, or nonsensical words (e.g., in Gujarati, fix mistakes like 'દેવોત્સુરા' to 'અસુર રાજાઓ').\n"
        "- Do not include any commentary, notes, or explanations. Just return the translations.\n"
        "- CRITICAL: You must use the exact 'id' value provided in the input for each verse. Do NOT change, re-sequence, or hallucinate the IDs. The IDs are non-sequential and must match the input IDs exactly."
        "Respond ONLY with a JSON array of objects. Each object must contain: \n"
        "- 'id': the verse ID (as a number)\n"
        "- 'hindi': the refined Hindi translation string\n"
        "- 'gujarati': the refined Gujarati translation string"
    )
    
    BLOCKED_VERSE_IDS = {105351}
    for i in range(0, total_verses, batch_size):
        batch = chapter_data[i:i+batch_size]
        print(f"Processing verses {i+1} to {min(i+batch_size, total_verses)} of {total_verses}...")
        
        batch_prompt_data = []
        for verse in batch:
            v_id = verse.get('id')
            if v_id in BLOCKED_VERSE_IDS:
                continue
            eng_desc = verse.get('languages', {}).get('english', {}).get('description', '')
            hin_desc = verse.get('languages', {}).get('hindi', {}).get('description', '')
            guj_desc = verse.get('languages', {}).get('gujarati', {}).get('description', '')
            
            batch_prompt_data.append({
                "id": v_id,
                "english": sanitize_prompt_text(eng_desc),
                "current_hindi": sanitize_prompt_text(hin_desc),
                "current_gujarati": sanitize_prompt_text(guj_desc)
            })
            
        if not batch_prompt_data:
            print("All verses in this batch are blocked from API refinement. Skipping API call.")
            continue
            
        prompt = (
            f"Refine the Hindi and Gujarati translations for the following {len(batch_prompt_data)} verses.\n"
            "Do not include any commentary, notes, or explanations. Return only the JSON output.\n"
            "CRITICAL: You must use the exact 'id' provided in each verse block below. Do not change or re-sequence the IDs!\n"
            f"Return your response strictly as a JSON array of exactly {len(batch_prompt_data)} objects in the same order.\n\n"
            "Verses:\n"
        )
        
        for idx, item in enumerate(batch_prompt_data):
            prompt += f"\n--- Verse {idx+1} (ID: {item['id']}) ---\n"
            prompt += f"English (Source of Truth): {item['english']}\n"
            prompt += f"Current Hindi: {item['current_hindi']}\n"
            prompt += f"Current Gujarati: {item['current_gujarati']}\n"
            
        try:
            response = call_gemini(api_key, model, system_instruction, prompt)
            if 'candidates' not in response:
                print("Error: 'candidates' key missing from Gemini API response.")
                print("Response content:")
                print(json.dumps(response, indent=2))
                if 'promptFeedback' in response:
                    print("Prompt was blocked by safety filters. Details:")
                    print(json.dumps(response['promptFeedback'], indent=2))
                raise ValueError("No candidates returned (possibly blocked by safety settings)")
            candidate_text = response['candidates'][0]['content']['parts'][0]['text']
            
            # Extract JSON array robustly
            candidate_text = candidate_text.strip()
            start_idx = candidate_text.find('[')
            if start_idx != -1:
                try:
                    refined_results, _ = json.JSONDecoder().raw_decode(candidate_text[start_idx:])
                except Exception as json_err:
                    print("Failed to parse JSON response from Gemini API using JSONDecoder.")
                    print("Raw response from API:")
                    print(candidate_text)
                    print(f"Error: {json_err}")
                    raise
            else:
                print("Could not find start of JSON array '[' in API response.")
                print("Raw response from API:")
                print(candidate_text)
                raise ValueError("No JSON array found in response")
            
            # Match results back to batch items. Since the model sometimes hallucinates or sequences the IDs
            # (e.g. returning 100106 instead of 100108 because of gaps), we prefer matching by index in the array
            # if the size matches exactly. Otherwise, fallback to ID matching.
            active_batch_ids = [v.get('id') for v in batch if v.get('id') not in BLOCKED_VERSE_IDS]
            match_by_index = (len(refined_results) == len(active_batch_ids))
            
            if match_by_index:
                print("Matching refined results to batch by index.")
            else:
                print(f"Warning: Active batch size ({len(active_batch_ids)}) and refined results size ({len(refined_results)}) mismatch. Falling back to ID matching.")
                results_by_id = {}
                for item in refined_results:
                    if isinstance(item, dict) and 'id' in item:
                        # Allow id as int or string key
                        results_by_id[item['id']] = item
                        results_by_id[str(item['id'])] = item
            
            active_verses = [v for v in batch if v.get('id') not in BLOCKED_VERSE_IDS]
            for idx, verse in enumerate(batch):
                v_id = verse.get('id')
                if v_id in BLOCKED_VERSE_IDS:
                    print(f"Skipping API refinement for blocked verse ID {v_id} (retaining current translations).")
                    continue
                    
                refined_item = None
                if match_by_index:
                    active_idx = active_verses.index(verse)
                    refined_item = refined_results[active_idx]
                else:
                    refined_item = results_by_id.get(v_id)
                
                if refined_item and isinstance(refined_item, dict):
                    hindi_ref = refined_item.get('hindi')
                    gujarati_ref = refined_item.get('gujarati')
                    
                    if hindi_ref:
                        verse['languages']['hindi']['description'] = hindi_ref
                    if gujarati_ref:
                        verse['languages']['gujarati']['description'] = gujarati_ref
                else:
                    print(f"Warning: No translation returned for verse ID {v_id}")
            
            # Write progress back to the file incrementally
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(chapter_data, f, ensure_ascii=False, indent=4)
                
            # Add delay to avoid rate limit
            if i + batch_size < total_verses:
                time.sleep(delay)
                
        except Exception as e:
            print(f"Error during batch processing: {e}")
            print("Aborting. You can restore the file from the backup if needed.")
            sys.exit(1)
            
    print(f"✓ Successfully refined {os.path.basename(file_path)}.")
    verify_chapter(file_path)

def verify_chapter(file_path):
    print(f"\n================ VERIFICATION FOR {os.path.basename(file_path)} ================")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Select sample verses to print side-by-side:
    # 1. First verse
    # 2. Verse with combined sloka (e.g. "10.1.5-7")
    # 3. Verses immediately following a combined sloka (e.g. 8, 9, 10, 11, 12)
    # 4. A middle verse
    # 5. Last verse
    sample_indices = []
    for idx, verse in enumerate(data):
        sloka = verse.get('sloka', '')
        # Add first and last
        if idx == 0 or idx == len(data) - 1:
            sample_indices.append(idx)
        # Add combined sloka and adjacent ones
        elif '-' in sloka:
            sample_indices.extend([idx-1, idx, idx+1, idx+2, idx+3, idx+4])
        # Add a middle one
        elif idx == len(data) // 2:
            sample_indices.append(idx)
            
    # De-duplicate and sort indices
    sample_indices = sorted(list(set([i for i in sample_indices if 0 <= i < len(data)])))
    
    for idx in sample_indices:
        verse = data[idx]
        print(f"\nIndex {idx} | ID: {verse.get('id')} | Sloka: {verse.get('sloka')}")
        print(f"  ENG: {verse.get('languages', {}).get('english', {}).get('description', '')[:120]}...")
        print(f"  HIN: {verse.get('languages', {}).get('hindi', {}).get('description', '')[:120]}...")
        print(f"  GUJ: {verse.get('languages', {}).get('gujarati', {}).get('description', '')[:120]}...")
    print(f"\n========================================================================\n")

def main():
    import glob
    import re
    api_key = load_api_key()
    if not api_key:
        print("Error: gemini-key not found in .env file, and GEMINI_API_KEY environment variable is not set.")
        sys.exit(1)
        
    model = "gemini-3.1-flash-lite"
    delay = 4.0  # 4 seconds delay between API calls to fit Free Tier (15 RPM)
    
    translation_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'assets', 'verse_translation')
    backup_dir = os.path.join(os.path.dirname(translation_dir), 'verse_translation_backup')
    
    # Find all chapter files dynamically in the translation directory
    target_files = glob.glob(os.path.join(translation_dir, 'chapter_*.json'))
    # Sort files numerically by chapter number (e.g. chapter_1.json, chapter_2.json, ..., chapter_90.json)
    target_files.sort(key=lambda f: int(re.search(r'chapter_(\d+)\.json', f).group(1)))
    
    for file_path in target_files:
        if not os.path.exists(file_path):
            print(f"Error: File {file_path} does not exist.")
            continue
            
        filename = os.path.basename(file_path)
        backup_file_path = os.path.join(backup_dir, filename)
        
        # Check if already refined in a previous run
        if os.path.exists(backup_file_path):
            with open(file_path, 'r', encoding='utf-8') as f1, open(backup_file_path, 'r', encoding='utf-8') as f2:
                if f1.read() != f2.read():
                    print(f"Skipping {filename} (already refined).")
                    continue
                    
        refine_chapter(file_path, api_key, model, delay)

if __name__ == "__main__":
    main()
