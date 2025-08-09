import pandas as pd
import numpy as np

# Load and examine the structure more carefully
df = pd.read_csv('CONSUMPTION-D-2.csv')

print('=== Understanding the data structure ===')

# Look for date patterns in the entire first column
date_col = df.columns[0]
print(f'Date column: {date_col}')

# Find rows with dates vs rows with patient data
date_rows = []
patient_rows = []

for idx, val in df[date_col].items():
    val_str = str(val).strip()
    if val_str and val_str != 'nan' and val_str != 'NaN':
        # Check if it looks like a date
        if any(pattern in val_str for pattern in ['-', '/', '20', '21']):
            date_rows.append((idx, val_str))
        else:
            patient_rows.append((idx, val_str))

print(f'\nFound {len(date_rows)} date entries:')
for idx, date in date_rows[:10]:
    print(f'  Row {idx}: {date}')

print(f'\nFound {len(patient_rows)} patient entries:')
for idx, patient in patient_rows[:5]:
    print(f'  Row {idx}: {patient}')

# Look at the pattern - dates seem to be followed by patient visits
print('\n=== Sample data around dates ===')
for idx, date_val in date_rows[:3]:
    print(f'\nDate row {idx}: {date_val}')
    # Show next few rows after date
    for i in range(idx+1, min(idx+4, len(df))):
        row_data = df.iloc[i]
        non_empty = []
        for col in df.columns[3:]:  # Drug columns
            if str(row_data[col]).strip() and str(row_data[col]) != 'nan':
                non_empty.append(f'{col}:{row_data[col]}')
        if non_empty:
            print(f'  Patient row {i}: Sex={row_data[df.columns[2]]}, Drugs={non_empty[:3]}')