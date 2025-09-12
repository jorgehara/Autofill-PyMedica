import os
import re

def extraer_afiliados_txt(path):
    afiliados = {}
    tipo = 'consultas' if 'consulta' in path else 'recetas'
    if not os.path.exists(path):
        return afiliados
    with open(path, encoding='utf-8') as f:
        bloque = []
        for linea in f:
            if linea.strip() == '' or linea.startswith('=') or linea.startswith('-'):
                continue
            if re.match(r'^\d+\. ', linea):
                if bloque:
                    procesar_bloque(bloque, afiliados)
                bloque = [linea.strip()]
            else:
                bloque.append(linea.strip())
        if bloque:
            procesar_bloque(bloque, afiliados)
    return afiliados

def procesar_bloque(bloque, afiliados):
    nombre = dni = credencial = ''
    diagnosticos = []
    consultas = recetas = 0
    for linea in bloque:
        if linea.startswith('DNI:'):
            dni = linea.split(':',1)[1].strip()
        elif linea.startswith('Credencial:'):
            credencial = linea.split(':',1)[1].strip()
        elif linea.startswith('Diagnóstico:'):
            diag = linea.split(':',1)[1].strip()
            if diag:
                diagnosticos.append(diag)
        elif linea.startswith('Consultas:'):
            try:
                consultas = int(linea.split(':',1)[1].strip())
            except:
                consultas = 0
        elif linea.startswith('Recetas:'):
            try:
                recetas = int(linea.split(':',1)[1].strip())
            except:
                recetas = 0
        elif re.match(r'^\d+\. ', linea):
            nombre = linea.split('. ',1)[1].strip()
    clave = (dni, nombre, credencial)
    if clave not in afiliados:
        afiliados[clave] = {'diagnosticos': set(), 'consultas': 0, 'recetas': 0}
    afiliados[clave]['diagnosticos'].update(diagnosticos)
    afiliados[clave]['consultas'] += consultas
    afiliados[clave]['recetas'] += recetas

def mergear_listas(path1, path2, salida):
    a1 = extraer_afiliados_txt(path1)
    a2 = extraer_afiliados_txt(path2)
    total = a1.copy()
    for clave, datos in a2.items():
        if clave in total:
            total[clave]['diagnosticos'].update(datos['diagnosticos'])
            total[clave]['consultas'] += datos.get('consultas', 0)
            total[clave]['recetas'] += datos.get('recetas', 0)
        else:
            total[clave] = {'diagnosticos': set(datos['diagnosticos']), 'consultas': datos.get('consultas', 0), 'recetas': datos.get('recetas', 0)}
    total_interacciones = sum(v['consultas'] + v['recetas'] for v in total.values())
    # Ordenar por número de consultas de mayor a menor
    items_ordenados = sorted(total.items(), key=lambda x: x[1]['consultas'], reverse=True)
    with open(salida, 'w', encoding='utf-8') as f:
        f.write('LISTADO TOTAL DE AFILIADOS CONSULTAS Y RECETAS\n')
        f.write('='*60+'\n\n')
        for i, (clave, datos) in enumerate(items_ordenados, 1):
            nombre, dni, credencial = clave[1], clave[0], clave[2]
            f.write(f'{i}. {nombre}\n')
            f.write(f'   DNI: {dni}\n')
            f.write(f'   Credencial: {credencial}\n')
            f.write(f'   Diagnóstico: {", ".join(sorted(datos["diagnosticos"]))}\n')
            f.write(f'   Consultas: {datos["consultas"]}\n')
            f.write(f'   Recetas: {datos["recetas"]}\n')
            f.write(f'   Total de interacciones (consultas+recetas): {datos["consultas"] + datos["recetas"]}\n')
            f.write('-'*50+'\n')
        f.write(f"\nTOTAL FINAL DE INTERACCIONES: {total_interacciones}\n")
    print(f'Archivo generado: {os.path.abspath(salida)}')

if __name__ == "__main__":
    # Ahora los archivos de entrada son los archivos procesados de resultados
    archivo_consultas = 'resultados/lista_afiliados_certificados.txt'
    archivo_recetas = 'resultados/lista_afiliados_recetas.txt'
    archivo_salida = 'resultados/lista_total_afiliados_consultas_y_recetas.txt'

    print(f"Archivo de consultas: {archivo_consultas}")
    print(f"Archivo de recetas: {archivo_recetas}")
    mergear_listas(
        archivo_consultas,
        archivo_recetas,
        archivo_salida
    )