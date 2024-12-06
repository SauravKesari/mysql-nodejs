const express = require('express');
const bodyParser = require('body-parser');
const sequelize = require('./utils/db');
const multer = require('multer');
const Employee = require('./models/employee');
const Department = require('./models/department');
const Visit = require('./models/visits');
const path = require('path');
const department = require('./models/department');
const {Op} = require('sequelize');

const app = express();

// Middleware to serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Body parser middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/'); // Folder for storing uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Unique filename
  },
});

const upload = multer({ storage }).single('file');


// POST route to add a new employee
app.post('/employees', upload, async (req, res) => {
  try {
    const { empName, age,salary,deptId } = req.body; // Extract form fields from the request
    const profileImg = req.file ? req.file.path : null; 

    // Create a new employee in the database
    const newEmp = await Employee.create({
      empName,
      age,
      profileImg,
      salary,
      departmentId: deptId,
    });

    res.status(201).json(newEmp);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/employees' , async (req, res) => {
  const result = await Employee.findAll({
    include: [
      {
          model: Department, 
          attributes: ['name','id'], 
      }, 
  ],
  attributes: ['id', 'empName', 'age', 'profileImg', 'salary',]
  });
  res.json(result);
});

app.get('/employees/:id', async (req,res) => {
  const employee = await Employee.findByPk(req.params.id);
  res.json(employee);
});

app.put('/employees/:id', upload, async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if (!employee) return res.status(404).send('Employee not found');

    const { empName, age,salary } = req.body;
    const profileImg = req.file? req.file.path : employee.profileImg;

    await employee.update({empName: empName, age: age, profileImg,salary});
    res.json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
})


app.delete('/employees/:id', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);
    if(!employee) return  res.status(404).send('Employee not found');

    await employee.destroy();
    res.send(employee);
  } catch(err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.post('/department', async (req, res) => {
  try {
    const { name } = req.body;
    const newDepartment = await Department.create({ name });
    res.status(201).json(newDepartment);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/department', async (req, res) => {
  const result = await Department.findAll();
  res.json(result);
});

app.put('/department', async (req, res) => { 
  try {
    const department = await Department.findByPk(req.body.id);
    if (!department) return res.status(404).send('Department not found');
    const { name } = req.body;
    await department.update({ name });
    res.json(department);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.delete('/department/:id', async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) return res.status(404).send('Department not found');
    await department.destroy();
    res.send(department);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.get('/employeeCount', async (req, res) => {
  const [results,metadata] = await sequelize.query(
    'SELECT SUM(salary) AS totalSalary FROM Employees WHERE departmentId = :departmentId',
    {
        replacements: { departmentId: 1 }, // Use replacements to prevent SQL injection
        type: sequelize.QueryTypes.SELECT // Specify the query type
    }
);
res.send(metadata)

})

app.post('/visits', async (req, res) => {
  try {
    const { EmployeeId, visitDate } = req.body;
    const existingVisit = await Visit.findOne({
      where: {
          EmployeeId: EmployeeId,
          visitDate: visitDate
      }
  });
  console.log(existingVisit);

  if (existingVisit) {
      return res.status(400).json({ error: 'Visit already exists for this employee on the given date.' });
  }
   
    const newVisit = await Visit.create({ EmployeeId, visitDate });
    res.status(201).json(newVisit);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
})

app.get('/visits', async (req, res) => {
  const result = await Visit.findAll({
    include: [
      {
          model: Employee, 
          attributes: ['id','empName','age','salary'],
          include: [
            {
                model: Department,
                attributes: ['name','id'],
            }
          ] 
      }, 
  ],
  attributes: ['id', 'visitDate']
  });
  res.json(result);
});

app.get('/countVisits', async (req, res) => {
  const [results, metadata] = await sequelize.query(
    'SELECT COUNT(*) AS totalVisits, visitDate FROM Visits GROUP BY visitDate',
    // {
    //     type: sequelize.QueryTypes.SELECT 
    // }
  );

    res.send(results);
})


Employee.belongsTo(Department,{constraints: true, onDelete: 'CASCADE', onUpdate: 'CASCADE'});
Department.hasMany(Employee, {constraints: true, onDelete: 'CASCADE', onUpdate: 'CASCADE'});
Employee.hasMany(Visit, {constraints: true, onDelete: 'CASCADE', onUpdate: 'CASCADE'});
Visit.belongsTo(Employee, {constraints: true, onDelete: 'CASCADE'});

sequelize.sync({ alter: true })
  .then(() => console.log('All models are synced'))
  .catch((err) => console.error(err));

// Start the server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
