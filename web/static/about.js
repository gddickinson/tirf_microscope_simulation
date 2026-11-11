// About: what the project is (README), the physics and imaging model, what is left out, how to run, credits.
import { route, app, api, esc } from './core.js';
import { loadPresets } from './ui.js';

route('about', async () => {
  const [info, pr] = await Promise.all([api('/info'), loadPresets()]);
  const D = pr.defaults;
  app().innerHTML = `<p class="kicker">About</p><h1 class="glow">TIRF Microscope Simulation</h1>
  <p class="lead">This project simulates a Total Internal Reflection Fluorescence (TIRF) microscope, an interactive platform for
  exploring the principles of TIRF microscopy. This site is the web version of the Python
  <a href="https://github.com/gddickinson/tirf_microscope_simulation">tirf_microscope_simulation</a> repository (version ${esc(info.version)}).</p>

  <h2>The physics</h2>
  <p>TIRF excites fluorophores only within roughly 100–200 nm of the coverslip: when light in glass (n1) meets the sample (n2 &lt; n1)
  beyond the critical angle it is totally reflected, and only an evanescent field penetrates the sample. The README's formulas,
  implemented in <span class="mono">physics/tirf_optics.py</span>:</p>
  <p><span class="eq">n1·sin θ1 = n2·sin θ2</span> <span class="eq">θc = arcsin(n2 / n1)</span></p>
  <p><span class="eq">d = λ / (4π·√(n1²·sin²θ − n2²))</span> <span class="eq">I(z) = I0·exp(−z / d)</span></p>
  <p>θ is measured from the interface normal, λ is the vacuum wavelength, and d is the depth where the intensity falls to 1/e.</p>

  <h2>The imaging model</h2>
  <p><span class="mono">physics/tirf_imaging.py</span> (and its JavaScript port) builds simulated camera images of a seeded sample:</p>
  <ul>
    <li><b>Sample</b>: ${D.n_surface} fluorophores in a near-surface band 0–${D.surface_band_nm} nm above the glass and ${D.n_bulk.toLocaleString('en')}
      spread through a ${D.depth_um} µm tall volume (defaults), diffusing with D = ${D.d_bulk_um2_s} µm²/s (volume) and ${D.d_surface_um2_s} µm²/s
      (laterally, near the surface), ${D.dt_s * 1000} ms per frame.</li>
    <li><b>Excitation</b>: TIRF I/I0 = exp(−z/d); epi I/I0 = 1 everywhere. I0 is the same in both (the Fresnel transmission factor, which
      depends on angle and polarisation, is not modelled).</li>
    <li><b>Detection</b>: ${D.brightness_photons} photons per fluorophore per frame at I/I0 = 1, a Gaussian PSF with σ = 0.21·λem/NA
      (λem = ${D.em_wavelength_nm} nm, NA ${D.na}), widened out of focus as σ·√(1 + (z/zdof)²) with zdof = λem·n2/NA² (focal plane at the glass),
      integrated over each pixel.</li>
    <li><b>Camera</b>: pixel size in the sample = camera pixel / magnification (default ${D.camera_pixel_um} µm / ${D.magnification}× =
      ${info.pixel_nm} nm), ${D.image_px} × ${D.image_px} px, ${D.background_photons} background photons per pixel, Poisson shot noise and
      ${D.read_noise_e} e⁻ rms read noise.</li>
  </ul>
  <p class="callout">This is a teaching model: no scattering, no refractive-index variation inside the cell, no photobleaching, no
  polarisation, and the PSF is a Gaussian approximation. The numbers are illustrative, not measured.</p>

  <h2>The desktop app</h2>
  <p>The PyQt5/pyqtgraph app (<span class="mono">main.py</span>) shows a light table with a ${esc(pr.table.laser.wavelength)} nm laser and a camera,
  sliders for the laser angles and power, component on/off checkboxes, a Light Table View and a Camera View. The ray is traced from the
  laser to the camera plane and a diffraction-limited spot is drawn where it hits (<a href="#/table">Light table</a>). Optical
  component classes in the code: ${info.component_classes.map(c => `<span class="tag c">${esc(c)}</span>`).join(' ')}; the default
  table uses the Laser and the Camera. The evanescent-field and imaging pages are additions made with this web interface
  (<span class="mono">physics/</span>), implementing the README's formulas; the desktop app does not show them yet.</p>

  <h2>Run it yourself</h2>
  <h3>Desktop app (PyQt5)</h3>
  <pre>git clone https://github.com/gddickinson/tirf_microscope_simulation.git
cd tirf_microscope_simulation
pip install -r requirements.txt
python main.py</pre>
  <h3>Web app (this site, with the Python API)</h3>
  <pre>pip install -r requirements-web.txt
python run_web.py          # http://127.0.0.1:8203</pre>
  <p>The local app computes <span class="mono">/api/optics</span>, <span class="mono">/api/table</span> and the cross-check reference with the
  Python code. The static GitHub Pages site (<span class="mono">scripts/build_static.py</span>) runs the same simulation in JavaScript.</p>

  <h2>Related</h2>
  <p>George's <a href="https://gddickinson.github.io/microscope-atlas/" target="_blank" rel="noopener">Microscope Atlas</a> covers many
  microscope types, including a <a href="https://gddickinson.github.io/microscope-atlas/#/lab/tirf-offset" target="_blank" rel="noopener">TIRF beam-offset</a>
  lab and an imaging <a href="https://gddickinson.github.io/microscope-atlas/#/calc" target="_blank" rel="noopener">calculator</a>.</p>

  <h2>Credits</h2>
  <p>George D. Dickinson (University of California, Irvine). MIT License. Cite via <span class="mono">CITATION.cff</span>.
  Web interface built with the shared web kit (FastAPI + plain ES modules, no external libraries).</p>`;
});
