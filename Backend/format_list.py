def format_patient_list(input_file, output_file):
    """
    Lee una lista de pacientes de un archivo y la formatea según el formato requerido por el popup.
    Formato de entrada: número_afiliado diagnóstico presión_alta presión_baja
    """
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        formatted_lines = []
        for line in lines:
            # Limpiar espacios extras y dividir los campos
            fields = line.strip().split()
            if len(fields) == 4:
                num_afiliado, diagnostico, presion_alta, presion_baja = fields                # Formatear la línea según el formato requerido
                formatted_line = f"{num_afiliado},{diagnostico},{presion_alta},{presion_baja}"
                formatted_lines.append(formatted_line)

        # Guardar las líneas formateadas
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(formatted_lines))
            
        print(f"Se han formateado {len(formatted_lines)} registros.")
        print(f"Lista formateada guardada en: {output_file}")
        
        # Mostrar un ejemplo del formato
        if formatted_lines:
            print("\nEjemplo del formato:")
            print(formatted_lines[0])
            
    except Exception as e:
        print(f"Error al procesar el archivo: {str(e)}")

if __name__ == "__main__":
    # Rutas de los archivos
    input_file = "lista_pacientes.txt"  # Archivo con la lista original
    output_file = "lista_formateada.txt"  # Archivo donde se guardará la lista formateada
    
    format_patient_list(input_file, output_file)
