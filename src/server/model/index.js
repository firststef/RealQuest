class Model{
    constructor(){
        this.db = connect_db();
    }

    getLeaderBoards(){
        return this.db.get_all();
    }
}