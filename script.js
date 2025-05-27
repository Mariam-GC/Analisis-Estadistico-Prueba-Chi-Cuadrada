function generarFormulario() {
  const filas = parseInt(document.getElementById("filas").value);
  const columnas = parseInt(document.getElementById("columnas").value);

  let html = `<h3>Introduce los nombres de las filas y columnas:</h3>`;
  html += `<div><strong>Nombres de las filas:</strong><br>`;
  for (let i = 0; i < filas; i++) {
    html += `<input type="text" id="fila-${i}" placeholder="Fila ${i + 1}" required><br>`;
  }

  html += `<br><strong>Nombres de las columnas:</strong><br>`;
  for (let j = 0; j < columnas; j++) {
    html += `<input type="text" id="col-${j}" placeholder="Columna ${j + 1}" required><br>`;
  }

  html += `<button onclick="generarTabla(${filas}, ${columnas})">Generar matriz de observados</button>`;
  document.getElementById("formulario").innerHTML = html;
  document.getElementById("tablaObservados").innerHTML = "";
  document.getElementById("resultado").innerHTML = "";
}

function generarTabla(filas, columnas) {
  let table = `<table><thead><tr><th></th>`;
  for (let j = 0; j < columnas; j++) {
    const colName = document.getElementById(`col-${j}`).value || `Col ${j+1}`;
    table += `<th>${colName}</th>`;
  }
  table += `</tr></thead><tbody>`;

  for (let i = 0; i < filas; i++) {
    const rowName = document.getElementById(`fila-${i}`).value || `Fila ${i+1}`;
    table += `<tr><th>${rowName}</th>`;
    for (let j = 0; j < columnas; j++) {
      table += `<td><input type="number" id="obs-${i}-${j}" min="0" value="0"></td>`;
    }
    table += `</tr>`;
  }
  table += `</tbody></table>`;

  table += `<br><label for="alpha">Nivel de significancia:</label>
            <input type="number" id="alpha" value="0.05" step="0.01" min="0" max="1">`;

  table += `<br><button onclick="calcularChiGeneral(${filas}, ${columnas})">Calcular Chi Cuadrada</button>`;

  document.getElementById("tablaObservados").innerHTML = table;
  document.getElementById("resultado").innerHTML = "";
}

function calcularChiGeneral(filas, columnas) {
  const observados = [];
  for (let i = 0; i < filas; i++) {
    observados[i] = [];
    for (let j = 0; j < columnas; j++) {
      const val = parseFloat(document.getElementById(`obs-${i}-${j}`).value);
      observados[i][j] = isNaN(val) ? 0 : val;
    }
  }

  const totFila = observados.map(fila => fila.reduce((a, b) => a + b, 0));
  const totCol = Array(columnas).fill(0);
  for (let j = 0; j < columnas; j++) {
    for (let i = 0; i < filas; i++) {
      totCol[j] += observados[i][j];
    }
  }
  const total = totFila.reduce((a, b) => a + b, 0);

  let chi = 0;
  let detalles = `<h3>Fórmula usada:</h3><p>χ² = Σ[(O - E)² / E]</p><ul>`;
  for (let i = 0; i < filas; i++) {
    for (let j = 0; j < columnas; j++) {
      const esperado = (totFila[i] * totCol[j]) / total;
      const obs = observados[i][j];
      const contrib = Math.pow(obs - esperado, 2) / esperado;
      chi += contrib;
      detalles += `<li>Celda (${i + 1}, ${j + 1}): O=${obs}, E=${esperado.toFixed(2)}, contribución=${contrib.toFixed(4)}</li>`;
    }
  }
  detalles += `</ul>`;

  const gl = (filas - 1) * (columnas - 1);
  const alpha = parseFloat(document.getElementById("alpha").value);
  const critico = getChiCritico(gl, alpha);
  const decision = chi > critico
    ? `<strong>Se rechaza H₀:</strong> Existe dependencia entre las variables.`
    : `<strong>No se rechaza H₀:</strong> No se encontró evidencia suficiente de dependencia.`;

  document.getElementById("resultado").innerHTML = `
    ${detalles}
    <p><strong>χ² calculado:</strong> ${chi.toFixed(4)}</p>
    <p><strong>Grados de libertad:</strong> ${gl}</p>
    <p><strong>χ² crítico (α=${alpha}):</strong> ${critico}</p>
    <p>${decision}</p>
  `;
  graficarChiCuadrada(gl, chi, alpha);
}

function getChiCritico(gl, alpha) {
  const tabla = {
    1: { 0.05: 3.841 },
    2: { 0.05: 5.991 },
    3: { 0.05: 7.815 },
    4: { 0.05: 9.488 },
    6: { 0.05: 12.592 },
    8: { 0.05: 15.507 },
    10: { 0.05: 18.307 }
  };
  return (tabla[gl] && tabla[gl][alpha]) || 5.99;
}
function graficarChiCuadrada(gl, chiCalculado, alpha) {
  const x = [];
  const y = [];
  const maxX = Math.max(chiCalculado + 5, 20);
  for (let i = 0; i <= 500; i++) {
    const val = i * (maxX / 500);
    x.push(val);
    y.push(jStat.chisquare.pdf(val, gl)); // usando jStat
  }

  const critico = jStat.chisquare.inv(1 - alpha, gl);

  const trazado = [
    {
      x: x,
      y: y,
      type: 'scatter',
      name: 'Distribución χ²',
      line: { color: 'purple' }
    },
    {
      x: x.filter(v => v >= chiCalculado),
      y: x.filter(v => v >= chiCalculado).map(v => jStat.chisquare.pdf(v, gl)),
      type: 'scatter',
      fill: 'tozeroy',
      mode: 'none',
      name: 'Área > χ²',
      fillcolor: 'rgba(255, 215, 0, 0.6)'
    },
    {
      x: [critico, critico],
      y: [0, jStat.chisquare.pdf(critico, gl)],
      type: 'scatter',
      mode: 'lines',
      name: `χ² crítico = ${critico.toFixed(2)}`,
      line: { dash: 'dash', color: 'red' }
    },
    {
      x: [chiCalculado, chiCalculado],
      y: [0, jStat.chisquare.pdf(chiCalculado, gl)],
      type: 'scatter',
      mode: 'lines',
      name: `χ² calculado = ${chiCalculado.toFixed(2)}`,
      line: { dash: 'dot', color: 'blue' }
    }
  ];

  const layout = {
    title: 'Distribución Chi-Cuadrada',
    xaxis: { title: 'χ²' },
    yaxis: { title: 'Densidad de probabilidad' },
    showlegend: true
  };

  Plotly.newPlot('graficoChi', trazado, layout);
}
