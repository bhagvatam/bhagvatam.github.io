#!/usr/bin/env python3
import os
import json
import urllib.request
import urllib.error
import ssl
import sys
import re

def load_api_key():
    env_path = '/Users/simkeyur/src/antigravity-apps/bhagvatam.github.io/.env'
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
    
    try:
        with urllib.request.urlopen(req, context=context, timeout=30) as response:
            res_data = response.read().decode('utf-8')
            return json.loads(res_data)
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
        raise
    except Exception as e:
        print(f"Error calling API: {e}")
        raise

def sanitize_prompt_text(text):
    if not text:
        return ""
    t = text
    
    # ---------------------------------------------
    # English replacements
    # ---------------------------------------------
    t = re.sub(r'\bbreast\b', 'form', t, flags=re.IGNORECASE)
    t = re.sub(r'\bbreasts\b', 'form', t, flags=re.IGNORECASE)
    t = re.sub(r'\bbosom\b', 'form', t, flags=re.IGNORECASE)
    t = re.sub(r'\bbosoms\b', 'form', t, flags=re.IGNORECASE)
    t = re.sub(r'\bnipple\b', 'tip', t, flags=re.IGNORECASE)
    t = re.sub(r'\bnipples\b', 'tips', t, flags=re.IGNORECASE)
    t = re.sub(r'\bsuck\b', 'drink', t, flags=re.IGNORECASE)
    t = re.sub(r'\bsucked\b', 'drank', t, flags=re.IGNORECASE)
    t = re.sub(r'\bsucking\b', 'drinking', t, flags=re.IGNORECASE)
    t = re.sub(r'\bvirgin\b', 'youthful', t, flags=re.IGNORECASE)
    t = re.sub(r'\blust\b', 'attraction', t, flags=re.IGNORECASE)
    t = re.sub(r'\bseized\b', 'rescued', t, flags=re.IGNORECASE)
    t = re.sub(r'\bbudding\b', 'developing', t, flags=re.IGNORECASE)
    t = re.sub(r'\bhips\b', 'limbs', t, flags=re.IGNORECASE)
    t = re.sub(r'\bwaist\b', 'middle', t, flags=re.IGNORECASE)
    t = re.sub(r'\bnaked\b', 'unclothed', t, flags=re.IGNORECASE)
    t = re.sub(r'\bnude\b', 'unclothed', t, flags=re.IGNORECASE)
    t = re.sub(r'\bcourtesan\b', 'lady', t, flags=re.IGNORECASE)
    t = re.sub(r'\bcourtesans\b', 'ladies', t, flags=re.IGNORECASE)
    
    # ---------------------------------------------
    # Hindi replacements
    # ---------------------------------------------
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
    t = re.sub(r'गणिकाएँ', 'महिलाएँ', t)
    t = re.sub(r'गणिका', 'महिला', t)
    t = re.sub(r'कूल्हे', 'कटिप्रदेश', t)
    t = re.sub(r'कूल्हों', 'कटिप्रदेश', t)
    
    # ---------------------------------------------
    # Gujarati replacements
    # ---------------------------------------------
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
    t = re.sub(r'ગણિકાઓ', 'મહિલાઓ', t)
    t = re.sub(r'ગણિકા', 'મહિલા', t)
    
    return t

def main():
    api_key = load_api_key()
    if not api_key:
        print("Error: api key not found.")
        sys.exit(1)
        
    model = "gemini-3.1-flash-lite"
    
    chapter_path = '/Users/simkeyur/src/antigravity-apps/bhagvatam.github.io/assets/verse_translation_backup/chapter_53.json'
    with open(chapter_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    # Last batch (verses 41 to 47, i.e. index 40 to end)
    batch = data[40:]
    print(f"Total verses in batch: {len(batch)}")
    
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
    
    batch_prompt_data = []
    for verse in batch:
        v_id = verse.get('id')
        eng_desc = verse.get('languages', {}).get('english', {}).get('description', '')
        hin_desc = verse.get('languages', {}).get('hindi', {}).get('description', '')
        guj_desc = verse.get('languages', {}).get('gujarati', {}).get('description', '')
        
        batch_prompt_data.append({
            "id": v_id,
            "english": sanitize_prompt_text(eng_desc),
            "current_hindi": sanitize_prompt_text(hin_desc),
            "current_gujarati": sanitize_prompt_text(guj_desc)
        })
        
    prompt = (
        f"Refine the Hindi and Gujarati translations for the following {len(batch)} verses.\n"
        "Do not include any commentary, notes, or explanations. Return only the JSON output.\n"
        "CRITICAL: You must use the exact 'id' provided in each verse block below. Do not change or re-sequence the IDs!\n"
        f"Return your response strictly as a JSON array of exactly {len(batch)} objects in the same order.\n\n"
        "Verses:\n"
    )
    
    for idx, item in enumerate(batch_prompt_data):
        prompt += f"\n--- Verse {idx+1} (ID: {item['id']}) ---\n"
        prompt += f"English (Source of Truth): {item['english']}\n"
        prompt += f"Current Hindi: {item['current_hindi']}\n"
        prompt += f"Current Gujarati: {item['current_gujarati']}\n"
        
    print("--- CONSTRUCTED PROMPT ---")
    print(prompt)
    print("--------------------------")
    
    try:
        response = call_gemini(api_key, model, system_instruction, prompt)
        print("SUCCESS!")
        print(json.dumps(response, indent=2))
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    main()
