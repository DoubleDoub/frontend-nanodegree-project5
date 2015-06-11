
/**
 * converts a string into a dom element
 * @param  {string}(optional) tagName name of the element tag that needs to be
 *                            returned defaults to div
 * @param  {string} innerHTML The string thats needs to be converted
 * @return {dom element} element containing the template
 */
var getTemplate = function (innerHTML, tagName){
    //@todo does this tagName param make any sense????
    // defaults to div element
    tagName = tagName || 'div';
    var el = document.createElement(tagName);
    el.innerHTML = innerHTML;
    // check if template is valid
    if (!el.hasChildNodes){
        console.error('The template you tried to get does not have any childNodes' + innerHTML);
        // return an empty div element
        return el;
    }
    // when the template contains more then one nodes in the first dimension return all nodes
    if (el.childNodes >= 1){
        return el.childNodes;
    }
    // return the first child
    return el.firstChild;
};