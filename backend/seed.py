import os
import random
import requests
import string

BASE_URL = "http://localhost:8081/api"
IMAGES_DIR = r"C:\Users\bhatt\OneDrive\Desktop\Projects\Istay\Images\Property"

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

def run():
    # Register a user
    email = f"seeder_{random_string()}@example.com"
    password = "password123"
    print(f"Registering user: {email}")
    reg_res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "Seeder",
        "email": email,
        "password": password
    })
    
    # Login
    print("Logging in...")
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": email,
        "password": password
    })
    if login_res.status_code != 200:
        print("Login failed:", login_res.text)
        return
        
    token = login_res.json().get('token')
    headers = {"Authorization": f"Bearer {token}"}
    
    locations = ["Dehradun", "Delhi", "Mumbai", "Bangalore", "Pune", "Jaipur", "Ahmedabad", "Chennai"]
    
    # Add properties
    for i in range(1, 16):
        folder_path = os.path.join(IMAGES_DIR, f"P{i}")
        if not os.path.exists(folder_path):
            print(f"Folder not found: {folder_path}")
            continue
            
        files = os.listdir(folder_path)
        if not files:
            continue
            
        image_path = os.path.join(folder_path, files[0])
        
        print(f"Uploading image for P{i}...")
        # Upload image
        with open(image_path, 'rb') as f:
            files_dict = {'images': f}
            upload_res = requests.post(f"{BASE_URL}/upload", headers=headers, files=files_dict)
            
        if upload_res.status_code != 200:
            print("Upload failed:", upload_res.text)
            image_url = ""
        else:
            image_url = upload_res.json().get('urls', [''])[0]
            
        price = 15000 + (i * 1500)
        
        cat = "LAND" if i % 3 == 0 else ("ROOM" if i % 3 == 1 else "HOUSE")
        
        property_data = {
            "title": f"Beautiful {cat.capitalize()} {i}",
            "description": f"This is an amazing {cat.lower()} located in a prime area with stunning views. Perfect for your needs.",
            "location": random.choice(locations),
            "price": price,
            "type": "RENT" if i % 2 == 0 else "SALE",
            "category": cat,
            "area": 1500 if cat == "LAND" else None,
            "areaUnit": "SQ_FT" if cat == "LAND" else None,
            "rooms": 0 if cat == "LAND" else random.randint(1, 4),
            "suitableFor": "ANY" if cat == "LAND" else ("FAMILY" if i % 2 == 0 else "ANY"),
            "amenities": "" if cat == "LAND" else "WiFi,Parking,AC",
            "imageUrls": [image_url] if image_url else []
        }
        
        print(f"Creating property P{i}...")
        prop_res = requests.post(f"{BASE_URL}/properties", headers=headers, json=property_data)
        if prop_res.status_code == 200:
            print(f"Property P{i} created successfully!")
        else:
            print(f"Failed to create P{i}:", prop_res.text)

if __name__ == '__main__':
    run()
