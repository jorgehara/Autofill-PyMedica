#pip install -r requirements.txt
#pip freeze > requirements.txt
#create entorno python
#python -m venv env
#cd env/Scripts
#env/bin/activate


from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Permite peticiones desde la extensión de Chrome

# Diccionario para simular una base de datos de diagnósticos
DIAGNOSTICOS = {
    "I10": "Hipertensión esencial (primaria)",
    "E11": "Diabetes mellitus tipo 2",
    "J45": "Asma",
    # Agrega más diagnósticos según necesites
}

@app.route("/")
def root():
    return jsonify({
        "mensaje": "Bienvenido a la API de AutoFill-PyMedica",
        "rutas_disponibles": [
            "/api/verificar-afiliado",
            "/api/buscar-diagnostico",
            "/api/buscar-practicas",
            "/api/guardar-presion"
        ]
    })

@app.route("/api/verificar-afiliado", methods=['POST'])
def verificar_afiliado():
    data = request.get_json()
    num_afiliado = data.get('numAfiliado')
    
    # Aquí puedes agregar la lógica para verificar el afiliado en tu sistema
    # Por ahora, simulamos una respuesta exitosa
    if num_afiliado:
        return jsonify({
            "success": True,
            "mensaje": f"Afiliado {num_afiliado} verificado correctamente"
        })
    return jsonify({
        "success": False,
        "mensaje": "Número de afiliado no proporcionado"
    }), 400

@app.route("/api/buscar-diagnostico", methods=['POST'])
def buscar_diagnostico():
    data = request.get_json()
    diagnostico = data.get('diagnostico', '').upper()
    
    resultados = {}
    for codigo, descripcion in DIAGNOSTICOS.items():
        if diagnostico in codigo or diagnostico in descripcion.upper():
            resultados[codigo] = descripcion
    
    return jsonify({
        "success": True,
        "resultados": resultados
    })

@app.route("/api/buscar-practicas", methods=['GET'])
def buscar_practicas():
    # Simulamos una lista de prácticas médicas disponibles
    practicas = [
        {
            "id": "427109",
            "descripcion": "PRESION ARTERIAL",
            "modalidad": "AMBULATORIO",
            "agrupador": "MEDICO DE CABECERA",
            "modulo": "MEDICO CABECERA"
        }
    ]
    
    return jsonify({
        "success": True,
        "practicas": practicas
    })

@app.route("/api/guardar-presion", methods=['POST'])
def guardar_presion():
    data = request.get_json()
    presion_alta = data.get('presionAlta')
    presion_baja = data.get('presionBaja')
    
    # Aquí puedes agregar la lógica para guardar los valores de presión
    # Por ahora, solo validamos que los valores existan
    if presion_alta and presion_baja:
        return jsonify({
            "success": True,
            "mensaje": "Valores de presión guardados correctamente",
            "datos": {
                "presionAlta": presion_alta,
                "presionBaja": presion_baja
            }
        })
    return jsonify({
        "success": False,
        "mensaje": "Faltan valores de presión"
    }), 400

if __name__ == "__main__":
    app.run(debug=True)
