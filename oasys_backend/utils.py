from bs4 import BeautifulSoup

def parse_hidden_fields(html_text):
    soup = BeautifulSoup(html_text, "html.parser")
    hidden_inputs = soup.find_all("input", type="hidden")
    fields = {}
    for inp in hidden_inputs:
        name = inp.get("name")
        value = inp.get("value", "")
        if name:
            fields[name] = value
    return fields
