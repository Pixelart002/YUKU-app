import os

# Path to your AndroidManifest.xml
# Capacitor projects usually have it here. Adjust if yours is different.
manifest_path = "android/app/src/main/AndroidManifest.xml"

permissions_to_add = [
    '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>',
    '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>'
]

def add_permissions():
    # 1. Check if file exists
    if not os.path.exists(manifest_path):
        print(f"❌ Error: File not found at {manifest_path}")
        print("Please make sure you are in the root directory of your Capacitor project.")
        print("Or check if 'android' folder exists. If not, run 'npx cap add android'.")
        return

    # 2. Read the file
    with open(manifest_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 3. Check if permissions already exist to avoid duplication
    if "android.permission.WRITE_EXTERNAL_STORAGE" in content:
        print("✅ Permissions already exist in AndroidManifest.xml. No changes made.")
        return

    # 4. Find the position to insert (before <application> tag is standard)
    insert_pos = content.find("<application")
    if insert_pos == -1:
        print("❌ Error: Could not find <application> tag in AndroidManifest.xml.")
        return

    # 5. Insert permissions
    # We add newlines and indentation for clean formatting
    new_content = content[:insert_pos] + "\n    <!-- Permissions added by Script -->\n    " + "\n    ".join(permissions_to_add) + "\n\n    " + content[insert_pos:]

    # 6. Write back to file
    with open(manifest_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    print("✅ Success! Storage permissions added to AndroidManifest.xml")
    print("👉 Now run: 'npx cap sync' to update your Android project.")

if __name__ == "__main__":
    add_permissions()