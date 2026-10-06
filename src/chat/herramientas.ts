// Etiquetas de las herramientas que usa Chelu ("Consultando alertas de hoy"...).
// Copiado de la web: Front-Govoy/src/routes/components/ChatChelu/helpers.ts (describirConsulta,
// describirHerramienta) y useChatChelu.ts (handleToolEv). Si cambian allí, hay que cambiarlas aquí.

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const mayuscula = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// '2026-10-02' -> '2 de octubre de 2026'
const fechaLegible = (iso: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    if (!m) return iso;
    const [, anio, mes, dia] = m;
    return `${Number(dia)} de ${MESES[Number(mes) - 1] || '?'} de ${anio}`;
};

const diaLegible = (dia?: string) => {
    if (!dia) return '';
    const d = dia.trim().toLowerCase();
    if (d === 'hoy' || d === 'today') return 'hoy';
    if (d === 'manana' || d === 'mañana' || d === 'tomorrow') return 'mañana';
    if (d === 'pasado manana' || d === 'pasado mañana') return 'pasado mañana';
    return fechaLegible(dia);
};

const ENTIDADES: Record<string, string> = {
    alerta_rutas: 'alertas',
    alerta_rutas_desviaciones: 'desviaciones de alertas',
    forensic_rutas: 'rutas',
    rutas: 'rutas',
    cod_ruta_proveedor: 'rutas por proveedor',
    paradas: 'paradas',
    proveedores_delegaciones: 'proveedores',
    depot: 'depots',
    estado_alertas: 'estados de alerta',
    pudos: 'PUDOS',
    recogidas: 'recogidas',
};

// Resume una SQL en palabras: tabla y filtros principales (delegación, proveedor, fecha).
function describirConsulta(sql?: string): string {
    if (!sql) return '';
    const s = sql.replace(/\s+/g, ' ').trim();
    const tabla = s.toLowerCase().match(/from\s+`?([a-z_]+)`?/)?.[1];
    const entidad = (tabla && ENTIDADES[tabla]) || 'datos';
    const filtros: string[] = [];
    const delegacion = s.match(/delegacion\s+like\s+'%\s*([^%']+?)\s*%'/i);
    if (delegacion) filtros.push(`de la delegación de ${mayuscula(delegacion[1].trim())}`);
    const proveedor = s.match(/proveedor\w*\s+like\s+'%\s*([^%']+?)\s*%'/i);
    if (proveedor) filtros.push(`del proveedor ${mayuscula(proveedor[1].trim())}`);
    if (/\brais\s*>\s*0\b/i.test(s) && entidad !== 'alertas') filtros.push('con alerta');
    const fecha = s.match(/'(\d{4}-\d{2}-\d{2})'/);
    if (fecha) filtros.push(`el ${fechaLegible(fecha[1])}`);
    else if (/curdate\(\)\s*-\s*interval\s+1\s+day/i.test(s)) filtros.push('de ayer');
    else if (/\bcurdate\(\)/i.test(s)) filtros.push('de hoy');
    return filtros.length ? `${entidad} ${filtros.join(' ')}` : entidad;
}

// Herramientas que no consultan la base de datos (tiempo y tráfico).
function describirHerramienta(nombre: string, args?: Record<string, unknown>): string {
    const localidad = typeof args?.localidad === 'string' ? mayuscula(args.localidad.trim()) : '';
    switch (nombre) {
        case 'consultar_tiempo': {
            const base = localidad ? `Consultando la previsión del tiempo en ${localidad}` : 'Consultando la previsión del tiempo';
            const dia = diaLegible(args?.dia as string | undefined);
            return dia ? `${base} (${dia})` : base;
        }
        case 'consultar_clima_historico': {
            const base = localidad ? `Consultando el tiempo histórico de ${localidad}` : 'Consultando el tiempo histórico';
            const inicio = fechaLegible((args?.fecha_inicio as string) || '');
            const fin = fechaLegible((args?.fecha_fin as string) || '');
            if (inicio && fin && fin !== inicio) return `${base} (del ${inicio} al ${fin})`;
            if (inicio) return `${base} (${inicio})`;
            return base;
        }
        case 'consultar_trafico': {
            const verbo = args?.solo_cortes ? 'Consultando cortes de tráfico' : 'Consultando el tráfico';
            return localidad ? `${verbo} en ${localidad}` : verbo;
        }
        default:
            return '';
    }
}

export function etiquetaHerramienta(nombre: string, args?: Record<string, unknown>): string {
    const desc = describirConsulta((args?.consulta_sql ?? args?.sql) as string | undefined);
    if (nombre === 'generar_grafica') return desc ? `Generando gráfica de ${desc}` : 'Generando gráfica';
    if (nombre === 'generar_mapa') return desc ? `Generando mapa de ${desc}` : 'Generando mapa';
    if (nombre === 'ejecutar_sql_cex') return desc ? `Consultando ${desc}` : 'Consultando la base de datos';
    return describirHerramienta(nombre, args) || nombre || 'Herramienta';
}
