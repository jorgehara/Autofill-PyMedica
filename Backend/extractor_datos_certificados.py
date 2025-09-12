def extraer_tabular(texto: str):
    """
    Extrae datos de un formato tabular como:
    Código  DNI        Nombre Apellido         Relación  DNI_afiliado  Credencial
    J009   17495661   BENITEZ INES VILMA ...  Titular   17495661      27174956613
    """
    print("Procesando formato tabular o CSV...")
    afiliados = {}
    # Detectar si el texto parece CSV (comas en la primera línea)
    es_csv = "," in texto.splitlines()[0] if texto.splitlines() else False
    if es_csv:
        for linea in texto.splitlines():
            campos = [c.strip() for c in linea.split(",")]
            if len(campos) < 6:
                continue
            diagnostico, dni, nombre, relacion, dni_afiliado, credencial = campos[:6]
            clave = (nombre, dni, credencial)
            if clave not in afiliados:
                afiliados[clave] = {"cantidad": 0, "diagnosticos": set()}
            afiliados[clave]["cantidad"] += 1
            afiliados[clave]["diagnosticos"].add(diagnostico)
    else:
        # El diagnóstico es el primer campo: una letra mayúscula y 3 números
        patron = r"^([A-Z][0-9]{3})\s+(\d{7,9})\s+([A-ZÁÉÍÓÚÑ ,.'-]+)\s+(Titular|Concubino/a|Hijo menor|Hijo Estudiante|Hijo/a|Cónyuge|Conyuge|Padre|Madre)\s+(\d{7,9})\s+(\d{8,})$"
        for linea in texto.splitlines():
            linea = linea.strip()
            m = re.match(patron, linea)
            if m:
                diagnostico, dni, nombre, relacion, dni_afiliado, credencial = m.groups()
                clave = (nombre.strip(), dni, credencial)
                if clave not in afiliados:
                    afiliados[clave] = {"cantidad": 0, "diagnosticos": set()}
                afiliados[clave]["cantidad"] += 1
                afiliados[clave]["diagnosticos"].add(diagnostico)
    if not os.path.exists('resultados'):
        os.makedirs('resultados')
    ruta_salida = 'resultados/lista_afiliados_certificados.txt'
    with open(ruta_salida, 'w', encoding='utf-8') as f:
        f.write("LISTADO DE AFILIADOS (FORMATO TABULAR) Y CONSULTAS\n")
        f.write("==========================================================\n\n")
        claves_ordenadas = sorted(afiliados.keys(), key=lambda x: afiliados[x]["cantidad"], reverse=True)
        for i, clave in enumerate(claves_ordenadas, 1):
            nombre, dni, credencial = clave
            cantidad = afiliados[clave]["cantidad"]
            diagnosticos = ", ".join(sorted(afiliados[clave]["diagnosticos"]))
            f.write(f"{i}. {nombre}\n")
            f.write(f"   DNI: {dni}\n")
            f.write(f"   Credencial: {credencial}\n")
            f.write(f"   Obra social: INSSSEP AMB\n")
            f.write(f"   Consultas: {cantidad}\n")
            f.write(f"   Recetas: 0\n")
            f.write(f"   Diagnóstico: {diagnosticos}\n")
            f.write("-" * 50 + "\n")
    print(f"\nArchivo guardado en: {os.path.abspath(ruta_salida)}")
    return len(claves_ordenadas), sum(afiliados[x]["cantidad"] for x in claves_ordenadas)
import re
import os

def extraer_datos_certificados(texto: str):
    """
    Extrae afiliados de INSSSEP AMB, aunque haya líneas intermedias como 'Dispensada' y saltos de línea variables.
    """
    print("Buscando coincidencias INSSSEP AMB...")

    # Patrón robusto: busca INSSSEP AMB, opcionalmente 'Dispensada', luego Afiliado, DNI y Credencial
    patron = r"INSSSEP AMB(?:\s*\nDispensada)?\s*\nAfiliado:\s*(.*?)\s*\nD\.N\.I\.: ?(\d+)\s*Credencial:\s*(\d+)"
    coincidencias = re.findall(patron, texto, re.MULTILINE)
    print(f"Encontradas {len(coincidencias)} coincidencias INSSSEP AMB")

    conteo_recetas = {}
    datos_afiliados = {}

    for nombre, dni, credencial in coincidencias:
        nombre = nombre.strip()
        dni = dni.strip()
        credencial = credencial.strip()
        conteo_recetas[dni] = conteo_recetas.get(dni, 0) + 1
        datos_afiliados[dni] = (nombre, credencial)

    if not os.path.exists('resultados'):
        os.makedirs('resultados')

    ruta_salida = 'resultados/lista_afiliados.txt'
    with open(ruta_salida, 'w', encoding='utf-8') as f:
        f.write("LISTADO DE AFILIADOS INSSSEP AMB Y CANTIDAD DE RECETAS\n")
        f.write("======================================================\n\n")
        dnis_ordenados = sorted(conteo_recetas.keys(), key=lambda x: conteo_recetas[x], reverse=True)
        for i, dni in enumerate(dnis_ordenados, 1):
            nombre, credencial = datos_afiliados[dni]
            cantidad = conteo_recetas[dni]
            f.write(f"{i}. {nombre}\n")
            f.write(f"   DNI: {dni}\n")
            f.write(f"   Credencial: {credencial}\n")
            f.write(f"   Obra social: INSSSEP AMB\n")
            f.write(f"   Cantidad de recetas: {cantidad}\n")
            f.write("-" * 50 + "\n")
    print(f"\nArchivo guardado en: {os.path.abspath(ruta_salida)}")
    return len(dnis_ordenados), sum(conteo_recetas.values())

def extraer_insssep_amb(texto: str):
    # Buscar todas las posiciones donde aparece INSSSEP AMB
    patron = r"INSSSEP AMB[^\n]*\n(?:Dispensada\n)?Afiliado:\s*(.*?)\nD\.N\.I\.: (\d+) Credencial: (\d+)"
    coincidencias = re.findall(patron, texto, re.MULTILINE)
    
    conteo_recetas = {}
    datos_afiliados = {}
    
    for nombre, dni, credencial in coincidencias:
        dni = dni.strip()
        nombre = nombre.strip()
        credencial = credencial.strip()
        conteo_recetas[dni] = conteo_recetas.get(dni, 0) + 1
        datos_afiliados[dni] = (nombre, credencial)
    
    # Crear carpeta 'resultados' si no existe
    if not os.path.exists('resultados'):
        os.makedirs('resultados')
    
    ruta_salida = 'resultados/lista_afiliados.txt'
    with open(ruta_salida, 'w', encoding='utf-8') as f:
        f.write("LISTADO DE AFILIADOS INSSSEP AMB Y CANTIDAD DE RECETAS\n")
        f.write("======================================================\n\n")
        dnis_ordenados = sorted(conteo_recetas.keys(), key=lambda x: conteo_recetas[x], reverse=True)
        for i, dni in enumerate(dnis_ordenados, 1):
            nombre, credencial = datos_afiliados[dni]
            cantidad = conteo_recetas[dni]
            f.write(f"{i}. {nombre}\n")
            f.write(f"   DNI: {dni}\n")
            f.write(f"   Credencial: {credencial}\n")
            f.write(f"   Obra social: INSSSEP AMB\n")
            f.write(f"   Cantidad de recetas: {cantidad}\n")
            f.write("-" * 50 + "\n")
    print(f"Archivo generado: {ruta_salida}")

def main():
    try:
        archivos_posibles = ['archivo_consultas_formateado.csv', 'data_insssep_misRX.txt', 'entrada.txt']
        archivo_entrada = None
        for archivo in archivos_posibles:
            if os.path.exists(archivo):
                archivo_entrada = archivo
                break
        if not archivo_entrada:
            print("Error: No se encontró ningún archivo de entrada válido")
            print("Busqué en:", os.getcwd())
            print("Archivos disponibles:", os.listdir())
            return
        print(f"Usando archivo: {archivo_entrada}")
        # Leer el archivo
        with open(archivo_entrada, 'r', encoding='utf-8') as f:
            texto = f.read()
        print(f"Archivo leído. Tamaño: {len(texto)} caracteres")
        # Diagnóstico: mostrar primeras 30 líneas del archivo de entrada
        print("\n--- Primeras 30 líneas del archivo de entrada para diagnóstico ---")
        for i, linea in enumerate(texto.splitlines()[:30], 1):
            print(f"{i:02d}: {linea}")
        print("--- Fin del diagnóstico ---\n")
        # Procesar el texto con el extractor original
        total_afiliados, total_recetas = extraer_datos_certificados(texto)
        # Si no se encontró nada, intentar con el formato tabular (ahora también procesa CSV)
        if total_afiliados == 0:
            print("No se encontraron coincidencias con el extractor INSSSEP AMB. Intentando formato tabular...")
            total_afiliados, total_recetas = extraer_tabular(texto)
        print("\nProcesamiento completado:")
        print(f"Total de afiliados únicos: {total_afiliados}")
        print(f"Total de recetas procesadas: {total_recetas}")
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()