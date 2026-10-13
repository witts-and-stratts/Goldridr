import { Liquid } from "liquidjs";
import { buildVariableLookup, type TemplateContext } from "./template-context";

const htmlEngine = new Liquid( { outputEscape: "escape" } );
const textEngine = new Liquid();

function scope( context: TemplateContext ): Record<string, unknown> {
  return { ...context, ...buildVariableLookup( context ) };
}

export function renderLiquidHtml( template: string, context: TemplateContext ): string {
  return htmlEngine.renderSync( htmlEngine.parse( template ), scope( context ) );
}

export function renderLiquidText( template: string, context: TemplateContext ): string {
  return textEngine.renderSync( textEngine.parse( template ), scope( context ) );
}
