import re

entrada = 'archivo_consultas.txt'
salida = 'archivo_consultas_formateado.csv'

with open(entrada, 'r', encoding='utf-8') as fin, open(salida, 'w', encoding='utf-8') as fout:
    for linea in fin:
        # Quitar espacios y tabulaciones extra entre campos, pero mantener los datos
        campos = re.split(r'\s{2,}|\t+', linea.strip())
        # Si la línea está vacía, saltar
        if not any(campos):
            continue
        # Unir los campos con coma
        fout.write(','.join(campos) + '\n')

print(f'Archivo formateado guardado en: {salida}')
