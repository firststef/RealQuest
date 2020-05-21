class View {

    templateSubstitute(data, variables){
        for (let variable in variables){
            if (variables.hasOwnProperty(variable)){
                data.split('{{ ' + variable + ' }}').join(variables[variable]);
            }
        }
    }
}

let view = new View();

module.exports = view;