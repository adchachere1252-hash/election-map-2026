"""Parse all 2026 ballot measures from Ballotpedia HTML - improved version.
The HTML has 417 measure-type cells because some appear in multiple contexts (timeline, etc).
We need to find the state-specific tables and extract measures from them."""
from bs4 import BeautifulSoup
import json
import re

with open('/home/ubuntu/upload/ballotpedia.org_2026_ballot_measures_1782486616141.html', 'r') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

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

MEASURE_TYPES = {
    'LRCA': 'Legislative Referred Constitutional Amendment',
    'CISS': 'Citizen-Initiated State Statute',
    'CICA': 'Citizen-Initiated Constitutional Amendment',
    'BI': 'Bond Issue',
    'LRSS': 'Legislative Referred State Statute',
    'IndISS': 'Indirect Initiated State Statute',
    'VR': 'Veto Referendum',
    'ACCQ': 'Automatic Constitutional Convention Question',
    'LRAQ': 'Legislative Referred Advisory Question',
    'IndICA': 'Indirect Initiated Constitutional Amendment',
    'CICA/SS': 'Citizen-Initiated Constitutional Amendment/State Statute',
}

all_measures = []
current_state = None
current_date = None

# Strategy: Find all elements in document order. Track state headers and date headers.
# When we find a table row with a measure type, assign it to the current state.
for elem in soup.find_all(['h3', 'h4', 'h5', 'p', 'table', 'tr', 'b', 'strong']):
    # Check for state headers
    if elem.name in ['h3', 'h4', 'h5']:
        text = elem.get_text().strip()
        if text in US_STATES:
            current_state = text
            current_date = None  # Reset date for new state
    
    # Check for date within state sections (usually bold or in a specific format)
    if elem.name in ['p', 'b', 'strong']:
        text = elem.get_text().strip()
        date_match = re.match(r'^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}$', text)
        if date_match and current_state:
            current_date = text

# Better approach: iterate through tables that follow state headers
all_measures = []
current_state = None

# Find all elements that could be state headers or tables
body = soup.find('body')
if not body:
    body = soup

# Walk through all elements looking for state sections
elements = body.find_all(['h3', 'h4', 'h5', 'table'])

for i, elem in enumerate(elements):
    if elem.name in ['h3', 'h4', 'h5']:
        text = elem.get_text().strip()
        if text in US_STATES:
            current_state = text
    elif elem.name == 'table' and current_state:
        # Check if this table has ballot measure data
        rows = elem.find_all('tr')
        header_row = rows[0] if rows else None
        
        # Check if this looks like a ballot measure table
        if header_row:
            header_text = header_row.get_text().strip()
            if 'Type' in header_text and ('Title' in header_text or 'Subject' in header_text):
                # This is a ballot measure table
                # Check for date header before this table
                prev = elem.find_previous_sibling()
                election_date = 'November 3, 2026'  # default
                while prev:
                    prev_text = prev.get_text().strip()
                    date_match = re.match(r'^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}', prev_text)
                    if date_match:
                        election_date = prev_text
                        break
                    if prev.name in ['h3', 'h4', 'h5']:
                        break
                    prev = prev.find_previous_sibling()
                
                for row in rows[1:]:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) >= 4:
                        measure_type = cells[0].get_text().strip()
                        title = cells[1].get_text().strip()
                        subject = cells[2].get_text().strip()
                        description = cells[3].get_text().strip()
                        result = cells[4].get_text().strip() if len(cells) > 4 else ''
                        yes_votes = cells[5].get_text().strip() if len(cells) > 5 else ''
                        no_votes = cells[6].get_text().strip() if len(cells) > 6 else ''
                        
                        if title and title != 'Title' and measure_type in MEASURE_TYPES:
                            all_measures.append({
                                'state': current_state,
                                'election_date': election_date,
                                'type_code': measure_type,
                                'type_full': MEASURE_TYPES.get(measure_type, measure_type),
                                'title': title,
                                'subject': subject,
                                'description': description,
                                'result': result,
                                'yes_votes': yes_votes,
                                'no_votes': no_votes
                            })

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

# Print election dates
dates = {}
for m in all_measures:
    d = m['election_date']
    dates[d] = dates.get(d, 0) + 1
print("\nElection dates:")
for d, c in sorted(dates.items()):
    print(f"  {d}: {c} measures")

# Print results summary
decided = [m for m in all_measures if m['result']]
print(f"\nAlready decided: {len(decided)}")
for m in decided:
    print(f"  [{m['state']}] {m['title'][:50]} -> {m['result']}")
