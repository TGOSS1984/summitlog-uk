# Mountain Data Sources

SummitLog UK is designed to work from a seeded master mountain database. Users then add their own progress records against those master mountain records.

## Primary Source: Database of British and Irish Hills

The main source for UK mountain and hill data is the Database of British and Irish Hills, usually abbreviated to DoBIH.

Source: The Database of British and Irish Hills  
Website: https://www.hill-bagging.co.uk/dobih/

DoBIH provides downloadable versions of its database for offline use, including for web and app developers. The downloads page also explains the preferred attribution format.

Recommended attribution wording:

> Mountain data adapted from The Database of British and Irish Hills.

Where a specific version is used, the version should be included, for example:

> Mountain data adapted from The Database of British and Irish Hills v18.4.

## Why DoBIH is suitable

DoBIH includes useful fields for SummitLog UK, including:

- mountain / hill name
- height in metres
- height in feet
- prominence / drop
- latitude
- longitude
- classification codes
- section / region data

These fields support the main SummitLog features:

- map pins
- height ranking
- collection filtering
- regional filtering
- progress dashboards
- personal completion logs

## Classification Mapping

The import command maps DoBIH classification codes into SummitLog collections.

Initial mappings:

| DoBIH Code | SummitLog Collection |
|---|---|
| W | Wainwrights |
| M | Munros |
| N | Nuttalls |

## Current Limitation: Welsh Nuttalls

DoBIH uses the `N` classification for Nuttalls across England and Wales.

SummitLog UK eventually wants Welsh Nuttalls as a separate collection. This means the import process needs an additional rule to separate Welsh Nuttalls from English Nuttalls.

Possible future approaches:

1. Use DoBIH region / section fields to identify Welsh hills.
2. Add a manual mapping file for Welsh Nuttalls.
3. Import all Nuttalls first, then generate Welsh Nuttalls as a filtered collection.

For now, the import pipeline supports the broader `Nuttalls` collection.