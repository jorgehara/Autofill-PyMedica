import re
import os

def extraer_datos(texto: str):
    """
    Extrae nombres, DNI y credenciales del texto y los guarda en un archivo TXT
    """
    # Debug: mostrar las primeras líneas del archivo
    print("Primeras líneas del archivo:")
    print(texto[:200])
    print("-" * 50)

    # Patrón para encontrar los datos
    patron = r"Afiliado:\s*(.*?)\nD\.N\.I\.:\s*(\d+)\s*Credencial:\s*(\d+)"
    
    print("Buscando coincidencias...")
    # Encontrar todas las coincidencias
    coincidencias = list(re.finditer(patron, texto, re.MULTILINE | re.DOTALL))
    print(f"Encontradas {len(coincidencias)} coincidencias")
    
    # Diccionario para contar recetas por DNI
    conteo_recetas = {}
    datos_afiliados = {}
    
    # Procesar coincidencias
    for match in coincidencias:
        nombre = match.group(1).strip()
        dni = match.group(2).strip()
        credencial = match.group(3).strip()
        
        print(f"Procesando: {nombre} - DNI: {dni}")
        
        # Contar recetas
        conteo_recetas[dni] = conteo_recetas.get(dni, 0) + 1
        # Guardar datos del afiliado
        datos_afiliados[dni] = (nombre, credencial)
    
    # Crear carpeta 'resultados' si no existe
    if not os.path.exists('resultados'):
        os.makedirs('resultados')
    
    # Guardar en archivo de texto
    ruta_salida = 'resultados/lista_afiliados.txt'
    with open(ruta_salida, 'w', encoding='utf-8') as f:
        f.write("LISTADO DE AFILIADOS Y CANTIDAD DE RECETAS\n")
        f.write("=========================================\n\n")
        
        # Ordenar por cantidad de recetas (de mayor a menor)
        dnis_ordenados = sorted(conteo_recetas.keys(), 
                              key=lambda x: conteo_recetas[x], 
                              reverse=True)
        
        for i, dni in enumerate(dnis_ordenados, 1):
            nombre, credencial = datos_afiliados[dni]
            cantidad = conteo_recetas[dni]
            f.write(f"{i}. {nombre}\n")
            f.write(f"   DNI: {dni}\n")
            f.write(f"   Credencial: {credencial}\n")
            f.write(f"   Cantidad de recetas: {cantidad}\n")
            f.write("-" * 50 + "\n")
    
    print(f"\nArchivo guardado en: {os.path.abspath(ruta_salida)}")
    return len(dnis_ordenados), sum(conteo_recetas.values())

def main():
    try:
        # Intentar primero con data_insssep_misRX.txt
        archivos_posibles = ['entrada.txt']
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
        
        # Procesar el texto
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