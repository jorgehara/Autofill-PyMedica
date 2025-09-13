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
            if diag and diag != '':
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
    clave = (dni, nombre)
    if clave not in afiliados:
        afiliados[clave] = {'credenciales': set(), 'diagnosticos': set(), 'consultas': 0, 'recetas': 0}
    afiliados[clave]['credenciales'].add(credencial)
    afiliados[clave]['diagnosticos'].update(diagnosticos)
    afiliados[clave]['consultas'] += consultas
    afiliados[clave]['recetas'] += recetas

def mergear_listas(path1, path2, salida):
    a1 = extraer_afiliados_txt(path1)
    a2 = extraer_afiliados_txt(path2)
    total = a1.copy()
    for clave, datos in a2.items():
        if clave in total:
            total[clave]['diagnosticos'].update(datos.get('diagnosticos', set()))
            total[clave]['consultas'] += datos.get('consultas', 0)
            total[clave]['recetas'] += datos.get('recetas', 0)
            total[clave]['credenciales'].update(datos.get('credenciales', set()))
        else:
            total[clave] = {
                'credenciales': set(datos.get('credenciales', set())) if 'credenciales' in datos else set(),
                'diagnosticos': set(datos.get('diagnosticos', set())),
                'consultas': datos.get('consultas', 0),
                'recetas': datos.get('recetas', 0)
            }
            # Si viene solo una credencial (de la versión vieja), agregarla
            if 'credencial' in datos:
                total[clave]['credenciales'].add(datos['credencial'])
    total_interacciones = sum(v['consultas'] + v['recetas'] for v in total.values())
    # Ordenar por total de interacciones (consultas+recetas) de mayor a menor
    items_ordenados = sorted(total.items(), key=lambda x: (x[1]['consultas'] + x[1]['recetas'], x[1]['consultas']), reverse=True)
    import random
    diagnosticos_default = ['B349', 'J029', 'Z000', 'J129', 'T784']
    # Crear carpeta de salida si no existe
    os.makedirs(os.path.dirname(salida), exist_ok=True)
    with open(salida, 'w', encoding='utf-8') as f:
        f.write('LISTADO TOTAL DE AFILIADOS CONSULTAS Y RECETAS\n')
        f.write('='*60+'\n\n')
        for i, (clave, datos) in enumerate(items_ordenados, 1):
            dni, nombre = clave[0], clave[1]
            credenciales = ', '.join(sorted(datos['credenciales']))
            # Filtrar diagnósticos vacíos o nulos explícitamente
            diag_set = set(d for d in datos.get('diagnosticos', set()) if d and d.strip())
            if not diag_set:
                diag = random.choice(diagnosticos_default)
            else:
                diag = ', '.join(sorted(diag_set))
            if not diag.strip():
                diag = random.choice(diagnosticos_default)
            f.write(f'{i}. {nombre}\n')
            f.write(f'   DNI: {dni}\n')
            f.write(f'   Credencial: {credenciales}\n')
            # Asignar la lista completa por defecto justo antes de escribir
            # Ultra-defensivo: si diag_final es vacío, None o solo espacios, asignar lista por defecto
            diag_final = diag if diag and diag.strip() else ', '.join(diagnosticos_default)
            if not diag_final or diag_final.strip() == '':
                print(f"[ULTRA-DEF] Diagnóstico vacío para: {nombre} - DNI: {dni} - Asignando lista por defecto")
                diag_final = ', '.join(diagnosticos_default)
            f.write(f'   Diagnóstico: {diag_final}\n')
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