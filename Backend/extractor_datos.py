import re
import os

def extraer_datos(texto: str):
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

    ruta_salida = 'resultados/lista_afiliados_recetas.txt'
    diagnosticos_default = ['B349', 'J029', 'Z000', 'J129', 'T784']
    diagnosticos_str = ', '.join(diagnosticos_default)
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
            f.write(f"   Consultas: 0\n")
            f.write(f"   Recetas: {cantidad}\n")
            f.write(f"   Diagnóstico: {diagnosticos_str}\n")
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
    
    ruta_salida = 'resultados/lista_afiliados_recetas.txt'
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

        base_dir = os.path.dirname(os.path.abspath(__file__))
        archivo_entrada = os.path.join(base_dir, 'archivo_recetas.txt')
        print("Archivos en Backend:", os.listdir(base_dir))
        if not os.path.exists(archivo_entrada):
            print(f"Error: No se encontró {archivo_entrada}")
            return
        print(f"Usando archivo: {archivo_entrada}")
        with open(archivo_entrada, 'r', encoding='utf-8') as f:
            texto = f.read()
        print(f"Archivo leído. Tamaño: {len(texto)} caracteres")
        total_afiliados, total_recetas = extraer_datos(texto)
        print("\nProcesamiento completado:")
        print(f"Total de afiliados únicos: {total_afiliados}")
        print(f"Total de recetas procesadas: {total_recetas}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()