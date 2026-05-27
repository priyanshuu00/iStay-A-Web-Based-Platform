import re

with open("dashboard.html", "r", encoding="utf-8") as f:
    dash = f.read()

with open("add-property.html", "r", encoding="utf-8") as f:
    add_prop = f.read()

# Grab everything from <!DOCTYPE html> to <body> from dashboard
header_match = re.search(r'<!DOCTYPE html>.*?<body>', dash, re.DOTALL)
if header_match:
    header = header_match.group(0)
    # modify title
    header = header.replace('Owner Dashboard — iStay', 'Add Property — iStay')
    header = header.replace('Manage your property listings on iStay - view, add, and remove your properties.', 'List your property on iStay for rent or sale and reach thousands of potential tenants and buyers.')
    
    # Prepend to add-property.html
    add_prop = header + '\n\n' + add_prop
    
    with open("add-property.html", "w", encoding="utf-8") as f:
        f.write(add_prop)
        
print("Fixed add-property.html header")
