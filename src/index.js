import domready from "domready"
import { voronoi } from "d3-voronoi"
import { polygonCentroid } from "d3-polygon"
import SimplexNoise from "simplex-noise"
import "./style.css"
import Color from "./Color";
import { clamp } from "./util";
import AABB from "./AABB";


const PHI = (1 + Math.sqrt(5)) / 2;
const TAU = Math.PI * 2;
const DEG2RAD_FACTOR = TAU / 360;

const config = {
    width: 0,
    height: 0
};

/**
 * @type CanvasRenderingContext2D
 */
let ctx;
let canvas;

// const col0 = Color.from("#062026")
// const col1 = Color.from("#b94c39")

const col0 = Color.from("#279cb6")
const col1 = Color.from("#cfdce8")


function randomPoints()
{
    const { width, height } = config;

    let pts = [];

    const count = Math.sqrt(width * height)/4;

    for(let i=0; i < count; i++)
    {
        const rnd = Math.random();
        pts.push([
            Math.random() * width,
            rnd * rnd * rnd * height
        ])
    }

    return pts;
}


function getPolygonMinMax(polygon)
{
    const aabb = new AABB()
    for (let j = 0; j < polygon.length; j++)
    {
        const [x, y] = polygon[j];

        aabb.add(x,y)
    }

    return aabb
}

const red = Color.from("#ff4e29")

function createPolygonMaskData(diagram)
{
    const { width, height } = config;
    const polygons = diagram.polygons();
    const tmpCanvas = document.createElement("canvas")
    tmpCanvas.width = width
    tmpCanvas.height = height

    /**
     * @type CanvasRenderingContext2D
     */
    const tmpCtx = tmpCanvas.getContext("2d")


    for (let i = 0; i < polygons.length; i++)
    {
        const polygon = polygons[i];
        const last = polygon.length - 1;


        const aabb = getPolygonMinMax(polygon)

        const { minX, minY, maxX, maxY } = aabb

        const rnd = Math.random();
        const spread = (maxY - minY) * rnd * rnd * rnd * rnd


        const v0 = (((minY + maxY) - spread/2) * 255/height)|0
        const v1 = ((v0 + spread) * 255/height)|0
        const vm = v0 + (v1 - v0) * 0.3


        const gradient = tmpCtx.createLinearGradient(minX, minY, maxX, maxY);
        gradient.addColorStop(0, `rgb(${v0},${v0},${v0})`)
        gradient.addColorStop(0.5, `rgb(${vm},${vm},${(v1+vm)/2})`)
        gradient.addColorStop(1, `rgb(${v1},${v1},${v1})`)

        tmpCtx.fillStyle = gradient
        tmpCtx.beginPath()
        tmpCtx.moveTo(polygon[last][0],polygon[last][1])
        for (let j = 0; j < polygon.length; j++)
        {
            const [x, y] = polygon[j];
            tmpCtx.lineTo(x,y)
        }
        tmpCtx.fill()
    }
    return tmpCtx.getImageData(0,0,width, height);
}


domready(
    () => {

        canvas = document.getElementById("screen");
        ctx = canvas.getContext("2d");

        const width = (window.innerWidth) | 0;
        const height = (window.innerHeight) | 0;

        config.width = width;
        config.height = height;

        canvas.width = width;
        canvas.height = height;


        const tmp = new Color(0,0,0)
        const paint = () => {

            const noise = new SimplexNoise();

            const v = voronoi().extent([[0,0],[width,height]])
            const pts = randomPoints();
            const diagram = v(pts)

            const maskData = createPolygonMaskData(diagram);
            const { data : mask } = maskData

            const imageData = ctx.createImageData(width, height);

            const { data } = imageData

            const ns = 0.6;
            
            let off = 0;
            for(let y = 0; y < height; y++)
            {
                for (let x = 0; x < width; x++)
                {
                    const v = mask[off + 2]/255
                    let ratio = (y / height - 0.15 + v * 0.6 + noise.noise3D(x*ns,y*ns,1) * 0.3);
                    col0.mix(col1, ratio, tmp)
                    tmp.mix(red, x/width * 0.15, tmp)

                    data[off] = tmp.r;
                    data[off + 1] = tmp.g;
                    data[off + 2] = tmp.b;
                    data[off + 3] = 255;

                    off += 4;
                }
            }

            ctx.putImageData(imageData, 0,0)

            // const edges = diagram.edges;
            //
            // ctx.lineWidth = 4
            // for (let i = 0; i < edges.length; i++)
            // {
            //     const edge = edges[i];
            //     if (edge)
            //     {
            //         const [ source, target ] = edge;
            //
            //         const x0 = source[0];
            //         const y0 = source[1];
            //         const x1 = target[0];
            //         const y1 = target[1];
            //
            //         if (x0 < x1)
            //         {
            //             const dx = x1 - x0;
            //             const dy = y1 - y0;
            //
            //             const value = 255 - (Math.atan2(dy, dx) + Math.PI) * 255/TAU
            //
            //             ctx.strokeStyle = `rgba(${value},${value},${value},0.5)`
            //             ctx.beginPath()
            //             ctx.moveTo(x0, y0)
            //             ctx.lineTo(x1, y1)
            //             ctx.stroke();
            //         }
            //
            //     }
            // }

        }

        paint()
    }
);
