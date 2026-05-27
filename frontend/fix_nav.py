import os
import re

files = ["dashboard.html", "add-property.html", "inbox.html", "index.html"]

navbar_ul = """                <ul class="navbar-nav me-auto">
                    <li class="nav-item"><a class="nav-link" href="index.html">Home</a></li>
                    <li class="nav-item"><a class="nav-link" href="houses.html">Houses</a></li>
                    <li class="nav-item"><a class="nav-link" href="rooms.html">Rooms</a></li>
                    <li class="nav-item"><a class="nav-link" href="lands.html">Lands</a></li>
                </ul>"""

index_navbar_ul = """                <ul class="navbar-nav me-auto">
                    <li class="nav-item"><a class="nav-link active" href="index.html">Home</a></li>
                    <li class="nav-item"><a class="nav-link" href="houses.html">Houses</a></li>
                    <li class="nav-item"><a class="nav-link" href="rooms.html">Rooms</a></li>
                    <li class="nav-item"><a class="nav-link" href="lands.html">Lands</a></li>
                </ul>"""

# For add-property.html, let's restore it completely since it got messed up.
def restore_add_property():
    # we know dashboard.html is mostly intact, let's just copy the top part of dashboard.html up to </nav> and replace the one in add-property.html
    with open("dashboard.html", "r", encoding="utf-8") as f:
        dash = f.read()
    with open("add-property.html", "r", encoding="utf-8") as f:
        add_prop = f.read()
    
    # Extract nav from dashboard
    nav_match = re.search(r'<!-- Navbar -->.*?<\/nav>', dash, re.DOTALL)
    if nav_match:
        nav = nav_match.group(0)
        # Update active state for add-property
        nav = nav.replace('href="dashboard.html" class="nav-link active"', 'href="dashboard.html" class="nav-link"')
        nav = nav.replace('href="add-property.html" class="nav-link"', 'href="add-property.html" class="nav-link active"')
        
        # Replace nav in add-property
        # since add-property might have multiple navbars or messed up, let's replace everything from <!-- Navbar --> to </nav> if it exists, or from <nav> to </nav>
        add_prop = re.sub(r'<!-- Navbar -->.*?<\/nav>', nav, add_prop, flags=re.DOTALL)
        
        # also remove duplicated <head> if it exists
        add_prop = re.sub(r'<!DOCTYPE html>.*?<body>.*?<!-- Navbar -->', '<!-- Navbar -->', add_prop, count=1, flags=re.DOTALL)
        
        with open("add-property.html", "w", encoding="utf-8") as f:
            f.write(add_prop)

restore_add_property()

for filename in files:
    if not os.path.exists(filename): continue
    with open(filename, "r", encoding="utf-8") as f:
        content = f.read()
        
    if filename == "index.html":
        content = re.sub(r'<ul class="navbar-nav me-auto">.*?<\/ul>', index_navbar_ul, content, flags=re.DOTALL)
    else:
        content = re.sub(r'<ul class="navbar-nav me-auto">.*?<\/ul>', navbar_ul, content, flags=re.DOTALL)
        
    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)

print("Navbar fixed!")
