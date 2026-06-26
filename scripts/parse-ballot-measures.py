"""Parse all 2026 ballot measures from Ballotpedia HTML."""
from bs4 import BeautifulSoup
import json
import re

with open('/home/ubuntu/upload/ballotpedia.org_2026_ballot_measures_1782486616141.html', 'r') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

# US states list for matching
US_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
    'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming'
]

# Find state sections by looking for h4 headers with state names
all_measures = []
current_state = None

# Get all h4 elements (state headers on Ballotpedia)
headers = soup.find_all(['h3', 'h4', 'h5'])

for header in headers:
    header_text = header.get_text().strip()
    
    # Check if this is a state header
    if header_text in US_STATES:
        current_state = header_text
        
        # Find the next table(s) after this header
        next_elem = header.find_next_sibling()
        while next_elem:
            if next_elem.name == 'table':
                # Parse the table rows
                rows = next_elem.find_all('tr')
                for row in rows[1:]:  # Skip header row
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 4:
                        measure_type = cells[0].get_text().strip()
                        title = cells[1].get_text().strip()
                        subject = cells[2].get_text().strip()
                        description = cells[3].get_text().strip()
                        result = cells[4].get_text().strip() if len(cells) > 4 else ''
                        
                        if title and title != 'Title':
                            all_measures.append({
                                'state': current_state,
                                'type': measure_type,
                                'title': title,
                                'subject': subject,
                                'description': description,
                                'result': result
                            })
                break  # Only get the first table after the header
            elif next_elem.name in ['h3', 'h4', 'h5']:
                break  # Hit next section
            next_elem = next_elem.find_next_sibling()

print(f"Total measures found: {len(all_measures)}")
print(f"States with measures: {len(set(m['state'] for m in all_measures))}")
print()

# Group by state
by_state = {}
for m in all_measures:
    if m['state'] not in by_state:
        by_state[m['state']] = []
    by_state[m['state']].append(m)

for state in sorted(by_state.keys()):
    print(f"{state}: {len(by_state[state])} measures")

# Save to JSON
with open('/home/ubuntu/election-map-2026/research/us-ballot-measures.json', 'w') as f:
    json.dump(all_measures, f, indent=2)

print(f"\nSaved {len(all_measures)} measures to research/us-ballot-measures.json")

# Print first few for verification
print("\n--- Sample measures ---")
for m in all_measures[:5]:
    print(f"  [{m['state']}] {m['type']}: {m['title'][:60]}...")
    print(f"    Subject: {m['subject'][:60]}")
    print()
