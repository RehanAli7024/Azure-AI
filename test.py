from document_processor import recreate_search_index

# Delete and recreate the index with the ID field marked as filterable
result = recreate_search_index()
print(f"Index recreation result: {result}")
